package expo.modules.mindfultracking

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class MindfulAccessibilityService : AccessibilityService() {

    private var overlayView: OverlayView? = null
    private var windowManager: WindowManager? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        
        val packageName = event.packageName?.toString() ?: return
        val className = event.className?.toString() ?: return

        val prefs = getSharedPreferences("TherapyPrefs", Context.MODE_PRIVATE)
        val blockedApps = prefs.getStringSet("blocked_apps", emptySet()) ?: emptySet()
        val isStrict = prefs.getBoolean("strict_mode", false)

        // Strict Mode: instantly minimize settings if they try to bypass accessibility
        if (isStrict && packageName == "com.android.settings" && className.contains("Accessibility")) {
            performGlobalAction(GLOBAL_ACTION_HOME)
            return
        }

        // If app is in our restricted list, mount the 5-sec friction overlay
        if (blockedApps.contains(packageName)) {
            showOverlay()
        } else {
            hideOverlay()
        }
    }

    private fun showOverlay() {
        if (overlayView != null) return
        val wm = windowManager ?: return

        overlayView = OverlayView(this)
        
        val layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        )
        wm.addView(overlayView, layoutParams)
    }

    private fun hideOverlay() {
        if (overlayView == null) return
        windowManager?.removeView(overlayView)
        overlayView = null
    }

    override fun onInterrupt() {
        hideOverlay()
    }
}
