package com.moodtracker.app

import android.app.AppOpsManager
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
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

            val usageStatsList = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                startTime,
                endTime
            )

            val result = Arguments.createArray()
            val dailyData = mutableMapOf<String, Long>()

            // Group by day and sum screen time
            for (usageStats in usageStatsList) {

                // Convert milliseconds to hours for better readability
                val timeInForegroundMinutes = usageStats.totalTimeInForeground / (1000 * 60)

                // Create a custom, readable log message for each object
                val logMessage = "App: ${usageStats.packageName}, " +
                        "Usage: $timeInForegroundMinutes minutes, " +
                        "Last Used: ${java.util.Date(usageStats.lastTimeUsed)}"

                Log.d(TAG, logMessage)

                val date = Date(usageStats.lastTimeUsed)
                val dayKey = String.format("%tY-%tm-%td", date, date, date)
                dailyData[dayKey] = (dailyData[dayKey] ?: 0) + usageStats.totalTimeInForeground
            }

            // Create array of daily screen time data
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
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SCREEN_TIME_ERROR", "Could not get screen time data", e)
        }
    }

    @ReactMethod
    fun getAppUsageData(promise: Promise) {
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

            // Group by package name and sum usage time
            for (usageStats in usageStatsList) {
                if (usageStats.totalTimeInForeground > 0) {
                    val packageName = usageStats.packageName
                    appUsageMap[packageName] = (appUsageMap[packageName] ?: 0) + usageStats.totalTimeInForeground
                }
            }

            // Sort by usage time and create result
            val sortedApps = appUsageMap.toList().sortedByDescending { it.second }
            
            for ((packageName, usageTime) in sortedApps.take(10)) { // Top 10 apps
                val appData = Arguments.createMap()
                appData.putString("packageName", packageName)
                appData.putDouble("usageHours", usageTime / (1000.0 * 60.0 * 60.0))
                appData.putLong("usageMs", usageTime)
                result.pushMap(appData)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("APP_USAGE_ERROR", "Could not get app usage data", e)
        }
    }
}
