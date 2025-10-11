package com.moodtracker.app

import android.app.AppOpsManager
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import java.util.*

class ScreenTimeModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    override fun getName() = "ScreenTimeModule"

    private val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

    @ReactMethod
    fun checkPermission(promise: Promise) {
        val appOpsManager = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOpsManager.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            reactApplicationContext.packageName
        )
        promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactApplicationContext.startActivity(intent)
            promise.resolve("Permission request sent")
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Could not open usage access settings", e)
        }
    }

    @ReactMethod
    fun getScreenTimeData(promise: Promise) {

        val TAG = "ScreenTimeModule - getScreenTimeData"

        try {
            val endTime = System.currentTimeMillis()
            val startTime = endTime - (7 * 24 * 60 * 60 * 1000) // Last 7 days

            val result = Arguments.createArray()
            val dailyData = mutableMapOf<String, Long>()

            // Get the launcher package name from the helper private function
            val launcherPackage = getLauncherPackageName()
            Log.d(TAG, "Launcher Package: $launcherPackage")

            // Query usage stats for each day individually to avoid double counting
            for (i in 6 downTo 0) {
                val dayStart = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, -i)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }.timeInMillis
                
                val dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1 // End of day
                
                val dayKey = String.format("%tY-%tm-%td", dayStart, dayStart, dayStart)
                Log.d(TAG, "Querying day $dayKey from $dayStart to $dayEnd")

                val usageStatsList = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY,
                    dayStart,
                    dayEnd
                )

                var dayTotalMs = 0L

                // Sum screen time for this specific day
                for (usageStats in usageStatsList) {
                    // Skip apps with zero usage time
                    if (usageStats.totalTimeInForeground == 0L) {
                        continue
                    }

                    val packageName = usageStats.packageName

                    // Skip launcher and system apps - these don't count as actual screen time
                    if (packageName == launcherPackage || isSystemApp(packageName)) {
                        Log.d(TAG, "Skipping system/launcher app: $packageName")
                        continue
                    }

                    // Convert milliseconds to minutes for better readability
                    val timeInForegroundMinutes = usageStats.totalTimeInForeground / (1000 * 60)

                    Log.d(TAG, "Day $dayKey - App: $packageName, Usage: $timeInForegroundMinutes minutes")
                    
                    dayTotalMs += usageStats.totalTimeInForeground
                }

                dailyData[dayKey] = dayTotalMs
                Log.d(TAG, "Day $dayKey total: ${dayTotalMs / (1000.0 * 60.0 * 60.0)}h (${dayTotalMs}ms)")
            }

            Log.d(TAG, "Final Daily Data: $dailyData")

            // Create array of daily screen time data for the last 7 days
            for (i in 6 downTo 0) {
                val date = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, -i)
                }
                val dayKey = String.format("%tY-%tm-%td", date, date, date)
                val screenTimeMs = dailyData[dayKey] ?: 0L
                val screenTimeHours = screenTimeMs / (1000.0 * 60.0 * 60.0)

                val dayData = Arguments.createMap()
                dayData.putString("date", dayKey)
                dayData.putDouble("screenTimeHours", screenTimeHours)
                dayData.putLong("screenTimeMs", screenTimeMs)
                result.pushMap(dayData)
                
                Log.d(TAG, "Final Day $dayKey: ${screenTimeHours}h (${screenTimeMs}ms)")
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting screen time data", e)
            promise.reject("SCREEN_TIME_ERROR", "Could not get screen time data", e)
        }
    }

    @ReactMethod
    fun getAppUsageData(promise: Promise) {

        val TAG = "ScreenTimeModule - getAppUsageData"

        try {
            val endTime = System.currentTimeMillis()
            val startTime = endTime - (24 * 60 * 60 * 1000) // Last 24 hours

            val usageStatsList = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                startTime,
                endTime
            )

            val result = Arguments.createArray()
            val appUsageMap = mutableMapOf<String, Long>()

            // Get the launcher package name from the helper private function
            val launcherPackage = getLauncherPackageName()
            Log.d(TAG, "Launcher Package: $launcherPackage")

            // Group by package name and sum usage time for last 24 hours only
            for (usageStats in usageStatsList) {

                if (usageStats.totalTimeInForeground > 0) {
                    val packageName = usageStats.packageName

                    // Skip launcher and system apps - these don't count as actual screen time
                    if (packageName == launcherPackage || isSystemApp(packageName)) {
                        Log.d(TAG, "Skipping system/launcher app in app usage: $packageName")
                        continue
                    }

                    // Only count usage within the last 24 hours
                    if (usageStats.lastTimeUsed >= startTime) {
                        appUsageMap[packageName] = (appUsageMap[packageName] ?: 0) + usageStats.totalTimeInForeground
                        Log.d(TAG, "App: $packageName, Usage: ${usageStats.totalTimeInForeground / (1000.0 * 60.0 * 60.0)}h")
                    }
                }
            }

            Log.d(TAG, "App Usage Map (last 24h, excluding system apps): $appUsageMap")

            // Sort by usage time and create result
            val sortedApps = appUsageMap.toList().sortedByDescending { it.second }

            for ((packageName, usageTime) in sortedApps.take(10)) { // Top 10 apps
                val appData = Arguments.createMap()
                appData.putString("packageName", packageName)
                appData.putDouble("usageHours", usageTime / (1000.0 * 60.0 * 60.0))
                appData.putLong("usageMs", usageTime)
                result.pushMap(appData)
                
                Log.d(TAG, "Final App: $packageName, Usage: ${usageTime / (1000.0 * 60.0 * 60.0)}h")
            }

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting app usage data", e)
            promise.reject("APP_USAGE_ERROR", "Could not get app usage data", e)
        }
    }



    // Private function to get the name of package launcher
    private fun getLauncherPackageName(): String? {
        val pm = reactApplicationContext.packageManager
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
        }
        val resolveInfo = pm.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
        return resolveInfo?.activityInfo?.packageName
    }


    // Private function check if an application is system app or not
    private fun isSystemApp(packageName: String): Boolean {
        val pm = reactApplicationContext.packageManager
        return try {
            val appInfo = pm.getApplicationInfo(packageName, 0)
            // Check for system app flags
            val isSystemApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
            val isUpdatedSystemApp = (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
            
            // Also exclude common system packages that shouldn't count as screen time
            val systemPackages = setOf(
                "android",
                "com.android.systemui",
                "com.android.launcher",
                "com.android.launcher3",
                "com.google.android.launcher",
                "com.samsung.android.launcher",
                "com.miui.home",
                "com.huawei.android.launcher",
                "com.oneplus.launcher",
                "com.android.settings",
                "com.android.phone",
                "com.android.incallui",
                "com.android.keychain",
                "com.android.providers.settings",
                "com.android.providers.media",
                "com.android.providers.downloads",
                "com.android.providers.contacts",
                "com.android.providers.calendar",
                "com.android.providers.telephony",
                "com.android.providers.downloads.ui",
                "com.android.documentsui",
                "com.android.packageinstaller",
                "com.android.calendar",
                "com.android.contacts",
                "com.android.mms",
                "com.android.dialer",
                "com.android.camera2",
                "com.android.gallery3d",
                "com.android.gallery",
                "com.android.music",
                "com.android.soundrecorder",
                "com.android.calculator2",
                "com.android.calculator",
                "com.android.deskclock",
                "com.android.alarmclock",
                "com.android.calendar",
                "com.android.email",
                "com.android.exchange",
                "com.android.mms",
                "com.android.providers.media",
                "com.android.providers.downloads",
                "com.android.providers.contacts",
                "com.android.providers.calendar",
                "com.android.providers.telephony",
                "com.android.providers.downloads.ui",
                "com.android.documentsui",
                "com.android.packageinstaller",
                "com.android.calendar",
                "com.android.contacts",
                "com.android.mms",
                "com.android.dialer",
                "com.android.camera2",
                "com.android.gallery3d",
                "com.android.gallery",
                "com.android.music",
                "com.android.soundrecorder",
                "com.android.calculator2",
                "com.android.calculator",
                "com.android.deskclock",
                "com.android.alarmclock",
                "com.android.calendar",
                "com.android.email",
                "com.android.exchange",
                "com.android.mms"
            )
            
            return isSystemApp || isUpdatedSystemApp || systemPackages.contains(packageName)
        } catch (e: PackageManager.NameNotFoundException) {
            e.printStackTrace()
            true
        }
    }
}
