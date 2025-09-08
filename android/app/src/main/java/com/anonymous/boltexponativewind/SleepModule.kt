package com.anonymous.boltexponativewind

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.SleepSegmentRequest

class SleepModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    companion object {
        var reactContext: ReactApplicationContext? = null
    }

    init {
        reactContext = context
    }

    override fun getName() = "SleepModule"

    private val sleepPendingIntent: PendingIntent by lazy {
        val intent = Intent(reactApplicationContext, SleepReceiver::class.java)
        PendingIntent.getBroadcast(reactApplicationContext, 0, intent, PendingIntent.FLAG_IMMUTABLE)
    }

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun startTracking(promise: Promise) {
        ActivityRecognition.getClient(reactApplicationContext)
            .requestSleepSegmentUpdates(sleepPendingIntent, SleepSegmentRequest.getDefaultSleepSegmentRequest())
            .addOnSuccessListener { promise.resolve("Successfully subscribed to Sleep API updates.") }
            .addOnFailureListener { e -> 
                // --- THIS IS THE MODIFIED LINE ---
                // We are now sending back the actual exception message from the API.
                promise.reject("API_ERROR", "Could not subscribe to Sleep API: ${e.localizedMessage}", e)
            }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        ActivityRecognition.getClient(reactApplicationContext)
            .removeSleepSegmentUpdates(sleepPendingIntent)
            .addOnSuccessListener { promise.resolve("Successfully unsubscribed from Sleep API updates.") }
            .addOnFailureListener { e -> 
                promise.reject("API_ERROR", "Could not unsubscribe from Sleep API: ${e.localizedMessage}", e)
            }
    }
}