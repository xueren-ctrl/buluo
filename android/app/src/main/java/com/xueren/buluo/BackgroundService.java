package com.xueren.buluo;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

/**
 * 后台监督服务（Foreground Service）
 * - 在通知中心常驻一条 ongoing 通知："部落小助手正在监督您的升级项目"
 * - 让用户直观感知 APP 在后台运行，提升信任感
 * - 用户授权 POST_NOTIFICATIONS 后通知才显示（Android 13+）
 * - START_STICKY：被系统杀死后会自动重启
 */
public class BackgroundService extends Service {

    private static final String CHANNEL_ID = "background_monitor";
    private static final int NOTIFICATION_ID = 1;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createChannel();
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("部落小助手")
                .setContentText("正在监督您的升级项目")
                .setSmallIcon(R.drawable.ic_stat_icon)
                .setOngoing(true)              // 常驻，用户无法划掉
                .setShowWhen(false)            // 不显示时间
                .setPriority(NotificationCompat.PRIORITY_LOW) // 低优先级，不发声
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();

        // Android 14+ (API 34) 要求显式声明 foregroundServiceType
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "后台监督",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("APP 在后台运行时显示常驻通知");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
