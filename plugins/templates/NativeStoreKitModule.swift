import Foundation
import StoreKit

// Native iOS StoreKit 2 bridge that replaces react-native-iap's purchase-
// listening path specifically. react-native-iap's purchaseUpdatedListener
// has been confirmed to sometimes never fire in the JS layer even though
// StoreKit completes the transaction on-device (visible in Console.app as
// successful markTransactionDone / TransactionHistoryRequest calls), so the
// app never calls validateReceipt(). Transaction.updates here is a second,
// independent listener with zero react-native-iap involvement: it starts
// the moment this module is instantiated by the bridge (which, on the
// classic/non-Turbo bridge this app uses, happens at bridge startup, not
// lazily on first JS access), so it is live well before JS finishes
// bootstrapping. Android is untouched -- see NativeBillingModule.kt for the
// equivalent Android-side fix, which this mirrors in spirit but not in API
// shape (Play Billing vs. StoreKit 2 are unrelated SDKs).
//
// This subclasses RCTEventEmitter, an Objective-C class from React Native.
// Swift sees it via the target's bridging header (see
// withNativeStoreKitModule.js, which ensures that header imports
// <React/RCTBridgeModule.h> and <React/RCTEventEmitter.h>) rather than a
// Swift `import React`, since RN's Objective-C headers are not exposed as a
// proper Swift module in this project. NativeStoreKitModule.m is the
// companion RCT_EXTERN_MODULE file that exposes this class's @objc methods
// to the bridge -- Swift classes are not auto-discovered by the RN bridge
// the way Kotlin classes are auto-discovered by Gradle's source set.
@objc(NativeStoreKitModule)
class NativeStoreKitModule: RCTEventEmitter {

  private static let realSubscriptionIds: Set<String> = [
    "com.yourname.veetha.premium.plan",
    "com.yourname.veetha.premium.annual",
  ]

  private var updatesTask: Task<Void, Never>?
  private var hasListeners = false

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
  func purchaseSubscription(_ productId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
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

        let result = try await product.purchase()

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
