// Objective-C bridge for NativeStoreKitModule.swift. The RN classic bridge
// discovers native modules via RCT_EXTERN_MODULE + RCT_EXTERN_METHOD macros
// in an Objective-C interface -- pure Swift classes are not auto-discovered
// the way Kotlin classes on Android are picked up by ReactPackage, so this
// file (not any Swift-side registration) is what makes
// NativeModules.NativeStoreKitModule exist in JS.
//
// Each RCT_EXTERN_METHOD selector below must exactly match the Objective-C
// selector Swift's @objc exposes for the corresponding method in
// NativeStoreKitModule.swift (external parameter labels included).
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(NativeStoreKitModule, RCTEventEmitter)

RCT_EXTERN_METHOD(fetchSubscriptionProducts:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(purchaseSubscription:(NSString *)productId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
