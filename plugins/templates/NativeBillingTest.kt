package __PACKAGE_NAME__

import android.content.Context
import android.util.Log
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams

// Diagnostic only: queries the real subscription product IDs directly against
// Google's BillingClient, bypassing react-native-iap entirely, to determine
// whether react-native-iap is the source of the empty-SKU issue.
// Safe to delete once the issue is diagnosed.
class NativeBillingTest(private val context: Context) {

  companion object {
    private const val TAG = "NativeBillingTest"
    private val REAL_SUBSCRIPTION_IDS = listOf(
      "com.yourname.veetha.premium.plan",
      "com.yourname.veetha.premium.annual"
    )
  }

  // Held as a field so the client isn't garbage collected before the async callback fires.
  private var billingClient: BillingClient? = null

  fun runTest() {
    Log.d(TAG, "=== NativeBillingTest starting (native BillingClient only, no react-native-iap) ===")

    val purchasesUpdatedListener = PurchasesUpdatedListener { billingResult, purchases ->
      Log.d(TAG, "onPurchasesUpdated: responseCode=${billingResult.responseCode} debugMessage=${billingResult.debugMessage} purchases=$purchases")
    }

    val client = BillingClient.newBuilder(context)
      .setListener(purchasesUpdatedListener)
      .enablePendingPurchases(
        PendingPurchasesParams.newBuilder()
          .enableOneTimeProducts()
          .build()
      )
      .build()
    billingClient = client

    client.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(setupResult: BillingResult) {
        Log.d(TAG, "onBillingSetupFinished: responseCode=${setupResult.responseCode} debugMessage=${setupResult.debugMessage}")

        if (setupResult.responseCode != BillingClient.BillingResponseCode.OK) {
          Log.d(TAG, "=== NativeBillingTest aborted: billing setup did not finish OK ===")
          return
        }

        val productList = REAL_SUBSCRIPTION_IDS.map { productId ->
          QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.SUBS)
            .build()
        }

        val params = QueryProductDetailsParams.newBuilder()
          .setProductList(productList)
          .build()

        client.queryProductDetailsAsync(params) { queryResult, result ->
          val productDetailsList = result.productDetailsList
          val unfetchedProductList = result.unfetchedProductList

          Log.d(TAG, "queryProductDetailsAsync RAW RESULT:")
          Log.d(TAG, "  responseCode=${queryResult.responseCode}")
          Log.d(TAG, "  debugMessage=${queryResult.debugMessage}")
          Log.d(TAG, "  requested IDs=$REAL_SUBSCRIPTION_IDS")
          Log.d(TAG, "  productDetailsList.size=${productDetailsList.size}")
          Log.d(TAG, "  unfetchedProductList=$unfetchedProductList")

          if (productDetailsList.isEmpty()) {
            Log.d(TAG, "  productDetailsList is EMPTY -- Google returned zero products for these exact IDs")
          }

          productDetailsList.forEach { details: ProductDetails ->
            Log.d(TAG, "  -> productId=${details.productId} title=${details.title} name=${details.name} type=${details.productType}")
            Log.d(TAG, "     subscriptionOfferDetails=${details.subscriptionOfferDetails}")
            Log.d(TAG, "     full toString()=$details")
          }

          val returnedIds = productDetailsList.map { it.productId }
          val missingIds = REAL_SUBSCRIPTION_IDS.filterNot { it in returnedIds }
          if (missingIds.isNotEmpty()) {
            Log.d(TAG, "  MISSING (requested but not returned by Google): $missingIds")
          }

          Log.d(TAG, "=== NativeBillingTest finished ===")
        }
      }

      override fun onBillingServiceDisconnected() {
        Log.d(TAG, "onBillingServiceDisconnected")
      }
    })
  }
}
