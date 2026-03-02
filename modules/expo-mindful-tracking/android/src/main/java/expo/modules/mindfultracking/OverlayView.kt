package expo.modules.mindfultracking

import android.content.Context
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class OverlayView(context: Context) : LinearLayout(context) {

    init {
        orientation = VERTICAL
        gravity = Gravity.CENTER
        setBackgroundColor(Color.parseColor("#121212")) // Dark premium background
        setPadding(60, 60, 60, 60)

        val title = TextView(context).apply {
            text = "Einen Moment"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 40)
        }

        val subtitle = TextView(context).apply {
            text = "Atme einmal tief durch, bevor du fortfährst."
            setTextColor(Color.LTGRAY)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 80)
        }

        val actionBtn = Button(context).apply {
            text = "Warte 5s..."
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.DKGRAY)
            isEnabled = false
            textSize = 18f
        }

        addView(title)
        addView(subtitle)
        addView(actionBtn)

        var countdown = 5
        val handler = Handler(Looper.getMainLooper())
        
        val runnable = object : Runnable {
            override fun run() {
                countdown--
                if (countdown > 0) {
                    actionBtn.text = "Warte ${countdown}s..."
                    handler.postDelayed(this, 1000)
                } else {
                    actionBtn.text = "Trotzdem öffnen"
                    actionBtn.isEnabled = true
                    actionBtn.setBackgroundColor(Color.parseColor("#C09D59")) // Our brand accent color
                    actionBtn.setOnClickListener {
                        // The user chose to bypass intentionally. 
                        // Save a 15-minute temporary bypass token so the AccessibilityService doesn't loop
                        val prefs = context.getSharedPreferences("TherapyPrefs", Context.MODE_PRIVATE)
                        val bypassExpiry = System.currentTimeMillis() + (15 * 60 * 1000L)
                        prefs.edit().putLong("access_expiry", bypassExpiry).apply()

                        // Forcefully hide it.
                        (parent as? android.view.ViewGroup)?.removeView(this@OverlayView)
                    }
                }
            }
        }
        handler.postDelayed(runnable, 1000)
    }
}
