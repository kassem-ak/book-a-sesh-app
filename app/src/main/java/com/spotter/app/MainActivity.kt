package com.spotter.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.SpotterApp
import com.spotter.app.ui.theme.SpotterTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            val vm: SpotterViewModel = viewModel()
            SpotterTheme(darkTheme = vm.isDark) {
                SpotterApp(vm)
            }
        }
    }
}
