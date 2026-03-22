package expo.modules.mindfultracking

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoMindfulTrackingModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("ExpoMindfulTracking")

        // Allows checking if the package usage stats permission is granted
        Function("hasUsageStatsPermission") {
            val context = appContext.reactContext ?: return@Function false
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            } else {
                appOps.checkOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.packageName
                )
            }
            mode == android.app.AppOpsManager.MODE_ALLOWED
        }

        // Opens the Settings page to ask for usage stats permission
        Function("requestUsageStatsPermission") {
            val context = appContext.reactContext
            if (context != null) {
                val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            }
        }

        // Get daily usage metrics for all apps in ms
        AsyncFunction("getNativeUsageStats") { interval: String ->
            val context = appContext.reactContext ?: return@AsyncFunction emptyMap<String, Long>()
            val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val calendar = java.util.Calendar.getInstance()
            val endTime = calendar.timeInMillis
            calendar.set(java.util.Calendar.HOUR_OF_DAY, 0)
            calendar.set(java.util.Calendar.MINUTE, 0)
            calendar.set(java.util.Calendar.SECOND, 0)
            val startTime = calendar.timeInMillis

            val usageStatsList = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
            val metrics = mutableMapOf<String, Long>()
            
            for (usageStats in usageStatsList) {
                val totalTimeInForeground = usageStats.totalTimeInForeground
                if (totalTimeInForeground > 0) {
                    metrics[usageStats.packageName] = totalTimeInForeground
                }
            }
            metrics
        }

        // Store a restricted app list so the Accessibility Service can read it.
        Function("setBlockedApps") { apps: List<String> ->
            val context = appContext.reactContext
            if (context != null) {
                val prefs = context.getSharedPreferences("TherapyPrefs", Context.MODE_PRIVATE)
                prefs.edit().putStringSet("blocked_apps", apps.toSet()).apply()
            }
        }

        // Check if strict block is enabled
        Function("setStrictMode") { isStrict: Boolean ->
            val context = appContext.reactContext
            if (context != null) {
                val prefs = context.getSharedPreferences("TherapyPrefs", Context.MODE_PRIVATE)
                prefs.edit().putBoolean("strict_mode", isStrict).apply()
            }
        }
        
        // Grant temporary access for N minutes
        Function("grantTemporaryAccess") { minutes: Int ->
            val context = appContext.reactContext
            if (context != null) {
                val expiryTime = System.currentTimeMillis() + (minutes * 60 * 1000L)
                val prefs = context.getSharedPreferences("TherapyPrefs", Context.MODE_PRIVATE)
                prefs.edit().putLong("access_expiry", expiryTime).apply()
            }
        }

        // Open Accessibility settings
        Function("requestAccessibilityPermission") {
            val context = appContext.reactContext
            if (context != null) {
                val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            }
        }
    }
}
