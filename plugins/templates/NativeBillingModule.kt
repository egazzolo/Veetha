package __PACKAGE_NAME__

import android.app.Activity
import android.util.Log
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

// Native Android billing bridge that replaces react-native-iap's Android
// product-fetch/purchase path with the BillingClient logic already proven
// working in NativeBillingTest.kt. iOS is untouched and keeps using
// react-native-iap -- only the Android branch of utils/iap.js calls into this.
class NativeBillingModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "NativeBillingModule"
    private val REAL_SUBSCRIPTION_IDS = listOf(
      "com.yourname.veetha.premium.plan",
      "com.yourname.veetha.premium.annual"
    )
  }

  override fun getName(): String = "NativeBillingModule"

  private var billingClient: BillingClient? = null

  // Cached from the last successful fetchSubscriptionProducts() call so
  // purchaseSubscription() can look up the full ProductDetails object that
  // launchBillingFlow() requires -- JS only ever passes the productId string.
  private val productDetailsCache = mutableMapOf<String, ProductDetails>()

  // Only one purchase flow is ever in flight; holds the promise until
  // PurchasesUpdatedListener fires.
  private var purchasePromise: Promise? = null

  private val purchasesUpdatedListener = PurchasesUpdatedListener { billingResult, purchases ->
    Log.d(TAG, "onPurchasesUpdated: responseCode=${billingResult.responseCode} debugMessage=${billingResult.debugMessage}")
    val promise = purchasePromise
    purchasePromise = null

    when {
      billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null -> {
        val purchase = purchases.firstOrNull()
        if (purchase == null) {
          promise?.reject("NO_PURCHASE", "Purchase succeeded but no purchase was returned")
        } else {
          promise?.resolve(purchaseToMap(purchase))
        }
      }
      billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED -> {
        promise?.reject("USER_CANCELED", "User canceled the purchase flow")
      }
      else -> {
        promise?.reject(
          "PURCHASE_ERROR",
          "responseCode=${billingResult.responseCode} debugMessage=${billingResult.debugMessage}"
        )
      }
    }
  }

  private fun purchaseToMap(purchase: Purchase): WritableMap = Arguments.createMap().apply {
    putString("purchaseToken", purchase.purchaseToken)
    putString("orderId", purchase.orderId)
    putString("productId", purchase.products.firstOrNull())
    putInt("purchaseState", purchase.purchaseState)
    putBoolean("isAcknowledged", purchase.isAcknowledged)
  }

  private fun getOrCreateClient(onReady: (BillingClient) -> Unit, onError: (String) -> Unit) {
    val existing = billingClient
    if (existing != null && existing.isReady) {
      onReady(existing)
      return
    }

    val client = BillingClient.newBuilder(reactContext)
      .setListener(purchasesUpdatedListener)
      .enablePendingPurchases(
        PendingPurchasesParams.newBuilder()
          .enableOneTimeProducts()
          .build()
      )
      .build()
    billingClient = client

    client.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(billingResult: BillingResult) {
        Log.d(TAG, "onBillingSetupFinished: responseCode=${billingResult.responseCode} debugMessage=${billingResult.debugMessage}")
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
          onReady(client)
        } else {
          onError("responseCode=${billingResult.responseCode} debugMessage=${billingResult.debugMessage}")
        }
      }

      override fun onBillingServiceDisconnected() {
        Log.d(TAG, "onBillingServiceDisconnected")
        // Will reconnect lazily on the next call via getOrCreateClient().
      }
    })
  }

  private fun queryProducts(
    client: BillingClient,
    productIds: List<String>,
    onResult: (List<ProductDetails>) -> Unit,
    onError: (String) -> Unit
  ) {
    val productList = productIds.map { productId ->
      QueryProductDetailsParams.Product.newBuilder()
        .setProductId(productId)
        .setProductType(BillingClient.ProductType.SUBS)
        .build()
    }

    val params = QueryProductDetailsParams.newBuilder()
      .setProductList(productList)
      .build()

    client.queryProductDetailsAsync(params) { billingResult, result ->
      if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
        onError("responseCode=${billingResult.responseCode} debugMessage=${billingResult.debugMessage}")
        return@queryProductDetailsAsync
      }
      onResult(result.productDetailsList)
    }
  }

  @ReactMethod
  fun fetchSubscriptionProducts(promise: Promise) {
    getOrCreateClient(
      onReady = { client ->
        queryProducts(
          client = client,
          productIds = REAL_SUBSCRIPTION_IDS,
          onResult = { productDetailsList ->
            val output: WritableArray = Arguments.createArray()

            productDetailsList.forEach { details ->
              productDetailsCache[details.productId] = details

              val offers = details.subscriptionOfferDetails.orEmpty()
              if (offers.isEmpty()) {
                output.pushMap(
                  offerToMap(details, offerId = null, offerToken = null, basePlanId = null, price = null, currency = null)
                )
              } else {
                offers.forEach { offer ->
                  val pricingPhase = offer.pricingPhases.pricingPhaseList.firstOrNull()
                  output.pushMap(
                    offerToMap(
                      details = details,
                      offerId = offer.offerId,
                      offerToken = offer.offerToken,
                      basePlanId = offer.basePlanId,
                      price = pricingPhase?.let { it.priceAmountMicros / 1_000_000.0 },
                      currency = pricingPhase?.priceCurrencyCode
                    )
                  )
                }
              }
            }

            promise.resolve(output)
          },
          onError = { message -> promise.reject("QUERY_FAILED", message) }
        )
      },
      onError = { message -> promise.reject("SETUP_FAILED", message) }
    )
  }

  private fun offerToMap(
    details: ProductDetails,
    offerId: String?,
    offerToken: String?,
    basePlanId: String?,
    price: Double?,
    currency: String?
  ): WritableMap = Arguments.createMap().apply {
    putString("productId", details.productId)
    putString("title", details.title)
    if (price != null) putDouble("price", price) else putNull("price")
    putString("currency", currency)
    putString("offerId", offerId)
    putString("offerToken", offerToken)
    putString("basePlanId", basePlanId)
  }

  @ReactMethod
  fun purchaseSubscription(productId: String, offerToken: String, promise: Promise) {
    val activity: Activity? = reactContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No current activity available to launch billing flow")
      return
    }

    getOrCreateClient(
      onReady = { client ->
        val cached = productDetailsCache[productId]
        if (cached != null) {
          launchFlow(client, activity, cached, offerToken, promise)
        } else {
          queryProducts(
            client = client,
            productIds = listOf(productId),
            onResult = { productDetailsList ->
              val details = productDetailsList.firstOrNull { it.productId == productId }
              if (details == null) {
                promise.reject("PRODUCT_NOT_FOUND", "No ProductDetails found for productId=$productId")
              } else {
                productDetailsCache[productId] = details
                launchFlow(client, activity, details, offerToken, promise)
              }
            },
            onError = { message -> promise.reject("QUERY_FAILED", message) }
          )
        }
      },
      onError = { message -> promise.reject("SETUP_FAILED", message) }
    )
  }

  private fun launchFlow(
    client: BillingClient,
    activity: Activity,
    productDetails: ProductDetails,
    offerToken: String,
    promise: Promise
  ) {
    val productDetailsParamsList = listOf(
      BillingFlowParams.ProductDetailsParams.newBuilder()
        .setProductDetails(productDetails)
        .setOfferToken(offerToken)
        .build()
    )

    val flowParams = BillingFlowParams.newBuilder()
      .setProductDetailsParamsList(productDetailsParamsList)
      .build()

    purchasePromise = promise

    val launchResult = client.launchBillingFlow(activity, flowParams)
    if (launchResult.responseCode != BillingClient.BillingResponseCode.OK) {
      purchasePromise = null
      promise.reject(
        "LAUNCH_FAILED",
        "responseCode=${launchResult.responseCode} debugMessage=${launchResult.debugMessage}"
      )
    }
    // On success the result arrives asynchronously via purchasesUpdatedListener.
  }

  @ReactMethod
  fun acknowledgePurchase(purchaseToken: String, promise: Promise) {
    getOrCreateClient(
      onReady = { client ->
        val params = AcknowledgePurchaseParams.newBuilder()
          .setPurchaseToken(purchaseToken)
          .build()

        client.acknowledgePurchase(params) { billingResult ->
          if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            promise.resolve(true)
          } else {
            promise.reject(
              "ACKNOWLEDGE_FAILED",
              "responseCode=${billingResult.responseCode} debugMessage=${billingResult.debugMessage}"
            )
          }
        }
      },
      onError = { message -> promise.reject("SETUP_FAILED", message) }
    )
  }
}
