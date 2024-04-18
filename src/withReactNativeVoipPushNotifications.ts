import { mergeContents, MergeResults } from '@expo/config-plugins/build/utils/generateCode';
import { ConfigPlugin, createRunOncePlugin, withAppDelegate } from 'expo/config-plugins';

const withReactNativeVoipPushNotifications: ConfigPlugin<void | string[]> = (config) => {
  console.log('Asdaa');
  return withVoipPushAppDelegate(config);
};

export function addVoipPushAppDelegateImport(src: string): MergeResults {
  return mergeContents({
    tag: 'withReactNativeVoipPushNotifications-import',
    src,
    newSrc: `
#import <PushKit/PushKit.h>
#import "RNVoipPushNotificationManager.h"
    `,
    anchor: /#import "AppDelegate\.h"/,
    offset: 1,
    comment: '//',
  });
}

export function addVoipPushAppDelegateInit(src: string): MergeResults {
  return mergeContents({
    tag: 'withReactNativeVoipPushNotifications-init',
    src,
    newSrc: `
[RNVoipPushNotificationManager voipRegistration];
    `,
    anchor: /\[super application:application didFinishLaunchingWithOptions:launchOptions\];/,
    offset: -1,
    comment: '//',
  });
}

export function addVoipPushAppDelegateMethods(src: string): MergeResults {
  return mergeContents({
    tag: 'withReactNativeVoipPushNotifications-methods',
    src,
    newSrc: `
- (void)pushRegistry:(PKPushRegistry *)registry didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type {
{
    [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:(NSString *)type];
}

- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type withCompletionHandler:(void (^)(void))completion {
{
    // --- NOTE: apple forced us to invoke callkit ASAP when we receive voip push
    // --- see: react-native-callkeep

    // --- Retrieve information from your voip push payload
    NSString *uuid = payload.dictionaryPayload[@"uuid"];
    NSString *callerName = [NSString stringWithFormat:@"%@ (Connecting...)", payload.dictionaryPayload[@"callerName"]];
    NSString *handle = payload.dictionaryPayload[@"handle"];

    [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:completion];

    [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:(NSString *)type];

    [RNCallKeep reportNewIncomingCall:uuid handle:handle handleType:@"generic" hasVideo:false localizedCallerName:callerName fromPushKit: YES payload:nil];

    completion();
}
    `,
    anchor: /@end/,
    offset: -1,
    comment: '//',
  });
}

const withVoipPushAppDelegate: ConfigPlugin = (config) => {
  return withAppDelegate(config, (config) => {
    if (!['objc', 'objcpp'].includes(config.modResults.language)) {
      throw new Error(
        "react-native-voip-push-notification config plugin does not support AppDelegate' that aren't Objective-C(++) yet."
      );
    }

    config.modResults.contents = addVoipPushAppDelegateImport(config.modResults.contents).contents;
    config.modResults.contents = addVoipPushAppDelegateInit(config.modResults.contents).contents;
    config.modResults.contents = addVoipPushAppDelegateMethods(config.modResults.contents).contents;

    return config;
  });
};

export default createRunOncePlugin(
  withReactNativeVoipPushNotifications,
  'react-native-voip-push-notification'
);
