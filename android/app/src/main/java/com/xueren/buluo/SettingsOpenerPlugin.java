package com.xueren.buluo;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 系统设置页跳转插件
 * ============================================
 * 解决 Capacitor WebView 中 <a href="intent://..."> 点击无反应的问题。
 * 通过原生 startActivity(Intent) 直接打开系统设置页。
 */
@CapacitorPlugin(name = "SettingsOpener")
public class SettingsOpenerPlugin extends Plugin {

    /**
     * 打开电池优化设置页（ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS）
     * 用户可在此把 APP 设为"不优化"
     */
    @PluginMethod
    public void openBatteryOptimization(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) {
            // 兜底：跳到通用设置
            try {
                Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(fallback);
                call.resolve(new JSObject().put("ok", true).put("fallback", true));
            } catch (Exception e2) {
                call.reject("无法打开电池优化设置: " + e2.getMessage());
            }
        }
    }

    /**
     * 请求忽略电池优化（直接弹出系统对话框，针对本 APP）
     */
    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) {
            call.reject("无法请求忽略电池优化: " + e.getMessage());
        }
    }

    /**
     * 打开厂商自启动管理页
     * 参数: manufacturer (xiaomi/huawei/honor/oppo/vivo/meizu 等)
     */
    @PluginMethod
    public void openAutostart(PluginCall call) {
        String manufacturer = call.getString("manufacturer", "unknown");
        String pkg = getContext().getPackageName();
        Intent intent = null;

        try {
            switch (manufacturer) {
                case "xiaomi":
                    intent = new Intent("miui.intent.action.APP_AUTO_START");
                    intent.putExtra("extra_pkgname", pkg);
                    break;
                case "huawei":
                case "honor":
                    intent = new Intent("huawei.intent.action.MANAGE_PROTECTED_APPS");
                    break;
                case "oppo":
                case "oneplus":
                case "realme":
                    intent = new Intent("com.coloros.safecenter.appauto.start");
                    break;
                case "vivo":
                    intent = new Intent("vivo.intent.action.bautostart");
                    break;
                case "meizu":
                    intent = new Intent("com.meizu.safe.security.SHOW_APPSEC");
                    break;
                case "samsung":
                    intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + pkg));
                    break;
                default:
                    intent = new Intent(Settings.ACTION_SETTINGS);
                    break;
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // 尝试启动厂商专用 Intent，失败则回退到应用详情页
            try {
                getActivity().startActivity(intent);
            } catch (Exception e) {
                // 厂商 Intent 不可用，回退到应用详情页
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallback.setData(Uri.parse("package:" + pkg));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(fallback);
            }
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) {
            call.reject("无法打开自启动设置: " + e.getMessage());
        }
    }

    /**
     * 打开厂商省电策略白名单页
     * 参数: manufacturer
     */
    @PluginMethod
    public void openPowerSaveWhitelist(PluginCall call) {
        String manufacturer = call.getString("manufacturer", "unknown");
        String pkg = getContext().getPackageName();
        Intent intent = null;

        try {
            switch (manufacturer) {
                case "xiaomi":
                    intent = new Intent("miui.intent.action.POWER_MODE");
                    break;
                case "huawei":
                case "honor":
                    intent = new Intent("huawei.intent.action.POWER_SAVING_MODE");
                    break;
                case "oppo":
                case "oneplus":
                case "realme":
                    intent = new Intent("com.coloros.oppoguardelf.PowerUsageModelActivity");
                    break;
                case "vivo":
                    intent = new Intent("vivo.intent.action.highpower.detail");
                    intent.setData(Uri.parse("package:" + pkg));
                    break;
                case "meizu":
                    intent = new Intent("com.meizu.safe.powerui.PowerAppPermissionActivity");
                    break;
                case "samsung":
                    intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    break;
                default:
                    intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    break;
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            try {
                getActivity().startActivity(intent);
            } catch (Exception e) {
                // 回退到电池优化设置
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(fallback);
            }
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) {
            call.reject("无法打开省电白名单设置: " + e.getMessage());
        }
    }

    /**
     * 打开 APP 通知设置页（APP_NOTIFICATION_SETTINGS）
     * 用户可在此开启/关闭通知、横幅、锁屏显示等
     */
    @PluginMethod
    public void openAppNotificationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) {
            // 回退到应用详情页
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(fallback);
                call.resolve(new JSObject().put("ok", true).put("fallback", true));
            } catch (Exception e2) {
                call.reject("无法打开通知设置: " + e2.getMessage());
            }
        }
    }

    /**
     * 打开应用详情设置页（通用兜底）
     */
    @PluginMethod
    public void openAppDetailsSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) {
            call.reject("无法打开应用详情: " + e.getMessage());
        }
    }
}
