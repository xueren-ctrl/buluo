package com.xueren.buluo;

import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 注册原生插件：系统设置页跳转（电池优化/自启动/通知设置等）
        registerPlugin(SettingsOpenerPlugin.class);
        super.onCreate(savedInstanceState);
        hideSystemBars();
        startBackgroundService();
    }

    /**
     * 启动后台监督服务（Foreground Service）
     * - 在通知中心常驻一条 ongoing 通知："部落小助手正在监督您的升级项目"
     * - 用户授权 POST_NOTIFICATIONS 后通知才显示（Android 13+）
     * - START_STICKY：被系统杀死后会自动重启
     */
    private void startBackgroundService() {
        try {
            Intent serviceIntent = new Intent(this, BackgroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            // 兜底：某些国产 ROM 可能限制后台启动 Service，忽略错误
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
        }
    }

    /**
     * 隐藏系统栏（状态栏 + 导航栏），实现全屏沉浸式 APP 体验。
     * 用户从屏幕边缘滑动可临时唤出系统栏，松手后自动隐藏。
     */
    private void hideSystemBars() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = getWindow().getInsetsController();
                if (controller != null) {
                    controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    );
                    controller.hide(WindowInsets.Type.systemBars());
                }
            } else {
                // Android 11 以下：用旧的 SYSTEM_UI_FLAG
                int flags = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
                getWindow().getDecorView().setSystemUiVisibility(flags);
            }
        } catch (Exception e) {
            // ignore：兼容性兜底
        }
    }
}
