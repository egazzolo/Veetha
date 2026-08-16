import Foundation
import StoreKit
import React

// Native iOS StoreKit 2 bridge: handles both purchase initiation
// (purchaseSubscription() calls product.purchase() directly, a real
// request/response call) and transaction delivery (Transaction.updates
// below, for renewals or a transaction completed while the app was
// closed). react-native-iap is not used for the iOS purchase flow at all --
// its own purchaseUpdatedListener was previously run in parallel with this
// module's Transaction.updates listener, which turned out to cause
// inconsistent delivery from having two independent observers of the same
// underlying transaction stream; react-native-iap's purchase handling was
// removed for iOS entirely rather than kept as a second path. Android is
// untouched -- see NativeBillingModule.kt for the equivalent Android-side
// module, which mirrors this in spirit but not in API shape (Play Billing
// vs. StoreKit 2 are unrelated SDKs).
//
// This subclasses RCTEventEmitter, an Objective-C class from React Native.
// `import React` (not a bridging header) is what makes it visible: the
// "React" CocoaPods pod (react-native/React.podspec) depends on
// "React-Core" (which declares RCTEventEmitter.h under header_dir "React"
// and sets DEFINES_MODULE => YES), so CocoaPods exposes it as a genuine
// Swift module even without `use_frameworks!` -- confirmed by Expo's own
// generated AppDelegate.swift (node_modules/expo/template.tgz), which
// imports RCTBridge/RCTLinkingManager/etc. the same way, and whose bundled
// bridging header ships completely empty. A bridging-header-based
// `#import <React/RCTEventEmitter.h>` was tried first and reliably failed
// to compile (verified against three real EAS builds) -- this project's
// React Native is not exposed to Swift that way. NativeStoreKitModule.m is
// the companion RCT_EXTERN_MODULE file that exposes this class's @objc
// methods to the bridge -- Swift classes are not auto-discovered by the RN
// bridge the way Kotlin classes are auto-discovered by Gradle's source set.
@objc(NativeStoreKitModule)
class NativeStoreKitModule: RCTEventEmitter {

  private static let realSubscriptionIds: Set<String> = [
    "com.yourname.veetha.premium.plan",
    "com.yourname.veetha.premium.annual",
  ]

  private var updatesTask: Task<Void, Never>?

  // startObserving()/stopObserving() run on RN's module queue; handle(updateResult:)
  // runs on Swift Concurrency's own executor via the detached Task below --
  // confirmed via real device logging (hasListeners read false immediately
  // after a JS listener had already attached) that a plain var read/written
  // across those two contexts can observe a stale value. Guarded with a lock
  // so every read/write goes through the same synchronization point.
  private let hasListenersLock = NSLock()
  private var _hasListeners = false
  private var hasListeners: Bool {
    get {
      hasListenersLock.lock()
      defer { hasListenersLock.unlock() }
      return _hasListeners
    }
    set {
      hasListenersLock.lock()
      _hasListeners = newValue
      hasListenersLock.unlock()
    }
  }

  // Cached from the last successful fetchSubscriptionProducts()/
  // purchaseSubscription() call so a purchase by productId string (all JS
  // ever passes) doesn't need a redundant Product.products(for:) round trip.
  private var productCache: [String: Product] = [:]

  override init() {
    super.init()
    startTransactionListener()
  }

  deinit {
    updatesTask?.cancel()
  }

  override class func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["onTransactionUpdate"]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  // Transaction.updates is StoreKit 2's async stream of every transaction
  // the app hasn't finished yet, replayed on every launch until finish() is
  // called -- this is what lets this listener pick up a purchase StoreKit
  // completed while react-native-iap's listener missed it, on this launch
  // or a later one.
  private func startTransactionListener() {
    updatesTask = Task.detached { [weak self] in
      for await result in Transaction.updates {
        await self?.handle(updateResult: result)
      }
    }
  }

  private func handle(updateResult result: VerificationResult<Transaction>) async {
    guard case .verified(let transaction) = result else {
      if case .unverified(let transaction, let error) = result {
        // Not handed to JS / validateReceipt: there is nothing trustworthy
        // to send, and storekit-jws-verify.ts's x5c chain check would
        // reject it anyway. Left unfinished so StoreKit keeps it in
        // Transaction.updates in case this was a transient verification
        // hiccup rather than a genuinely bad signature.
        NSLog("NativeStoreKitModule: ignoring unverified transaction id=\(transaction.id) error=\(error)")
      }
      return
    }

    guard hasListeners else {
      // No JS listener attached yet (e.g. very early in cold start, before
      // PaywallScreen has mounted and called setupPurchaseListeners()).
      // Deliberately not finishing here -- Transaction.updates will
      // redeliver this on the next iteration/launch once a listener is
      // attached, so nothing is lost.
      NSLog("NativeStoreKitModule: transaction id=\(transaction.id) arrived with no JS listener attached, will redeliver later")
      return
    }

    // jwsRepresentation lives on VerificationResult, not on the unwrapped
    // Transaction payload -- must be read from `result` (the original
    // VerificationResult<Transaction>), not from `transaction`.
    // https://developer.apple.com/documentation/storekit/verificationresult/jwsrepresentation-21vgo
    sendEvent(withName: "onTransactionUpdate", body: [
      "transactionId": String(transaction.id),
      "productId": transaction.productID,
      "jwsRepresentation": result.jwsRepresentation,
    ])

    // Mirrors the existing react-native-iap listener's behavior in
    // utils/iap.js: finish unconditionally once handed off, regardless of
    // what validateReceipt() on the JS side ends up deciding, so a
    // validation failure can never leave this stuck unfinished in the
    // on-device queue.
    await transaction.finish()
  }

  @objc
  func fetchSubscriptionProducts(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      do {
        let products = try await Product.products(for: Self.realSubscriptionIds)
        var output: [[String: Any]] = []
        for product in products {
          productCache[product.id] = product
          output.append([
            "productId": product.id,
            "displayName": product.displayName,
            "displayPrice": product.displayPrice,
            "price": NSDecimalNumber(decimal: product.price).doubleValue,
          ])
        }
        resolve(output)
      } catch {
        reject("FETCH_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc
  func purchaseSubscription(_ productId: String, appAccountToken: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      do {
        let product: Product
        if let cached = productCache[productId] {
          product = cached
        } else {
          let fetched = try await Product.products(for: [productId])
          guard let match = fetched.first else {
            reject("PRODUCT_NOT_FOUND", "No product found for id \(productId)", nil)
            return
          }
          productCache[productId] = match
          product = match
        }

        // appAccountToken must be a UUID -- this is the Supabase user id JS
        // sends, and is what ties a transaction back to the correct app
        // account server-side. Logged explicitly rather than silently
        // falling back to no options, so a conversion failure is never
        // invisible.
        var options: Set<Product.PurchaseOption> = []
        if let uuid = UUID(uuidString: appAccountToken) {
          options.insert(.appAccountToken(uuid))
        } else {
          NSLog("NativeStoreKitModule: appAccountToken '\(appAccountToken)' is not a valid UUID, purchasing WITHOUT appAccountToken")
        }

        let result = try await product.purchase(options: options)

        switch result {
        case .success(let verificationResult):
          switch verificationResult {
          case .verified(let transaction):
            // jwsRepresentation lives on VerificationResult (verificationResult
            // here), not on the unwrapped Transaction -- same fix as in
            // handle(updateResult:) above.
            resolve([
              "transactionId": String(transaction.id),
              "productId": transaction.productID,
              "jwsRepresentation": verificationResult.jwsRepresentation,
            ])
            await transaction.finish()
          case .unverified(_, let error):
            reject("UNVERIFIED", "Purchase completed but could not be verified: \(error.localizedDescription)", error)
          }
        case .userCancelled:
          reject("USER_CANCELLED", "User cancelled the purchase flow", nil)
        case .pending:
          reject("PENDING", "Purchase is pending (e.g. awaiting parental approval)", nil)
        @unknown default:
          reject("UNKNOWN_RESULT", "Unknown Product.PurchaseResult case", nil)
        }
      } catch {
        reject("PURCHASE_FAILED", error.localizedDescription, error)
      }
    }
  }
}
