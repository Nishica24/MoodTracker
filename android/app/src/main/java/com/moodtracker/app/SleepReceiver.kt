package com.moodtracker.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.SleepSegmentEvent
import com.google.gson.Gson

class SleepReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (SleepSegmentEvent.hasEvents(intent)) {
            val events = SleepSegmentEvent.extractEvents(intent)
            val gson = Gson()
            val eventsJson = gson.toJson(events)
            sendEvent(SleepModule.reactContext, "SleepUpdate", eventsJson)
        }
    }

    private fun sendEvent(reactContext: ReactApplicationContext?, eventName: String, data: String) {
        reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)?.emit(eventName, data)
    }
}