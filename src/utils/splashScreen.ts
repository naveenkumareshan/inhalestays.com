import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

export const hideSplashScreen = async () => {
  if (Capacitor.isNativePlatform()) {
    // Small delay to let the app render before hiding
    setTimeout(async () => {
      await SplashScreen.hide();
    }, 800);
  }
};
