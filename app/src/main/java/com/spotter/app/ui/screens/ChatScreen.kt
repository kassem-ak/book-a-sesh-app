package com.spotter.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Circle
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.spotter.app.data.Chat
import com.spotter.app.data.SampleData
import com.spotter.app.state.SpotterViewModel
import com.spotter.app.ui.components.AvatarTile
import com.spotter.app.ui.components.MicroBadge
import com.spotter.app.ui.components.SectionHeading
import com.spotter.app.ui.components.SpotterCard
import com.spotter.app.ui.theme.SpotterTheme

@Composable
fun ChatScreen(vm: SpotterViewModel) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp)
            .padding(top = 20.dp, bottom = 26.dp),
    ) {
        Text("Messages from coaches and partners", style = t.bodySm, color = c.txt3)
        Spacer(Modifier.height(3.dp))
        Text("Chat", style = t.pageTitle, color = c.txt)
        Spacer(Modifier.height(22.dp))
        SectionHeading("Conversations")
        Spacer(Modifier.height(11.dp))
        SampleData.chats.forEach { chat ->
            ChatListCard(chat, onOpen = { vm.openChat(chat.id) })
            Spacer(Modifier.height(11.dp))
        }
    }
}

@Composable
private fun ChatListCard(chat: Chat, onOpen: () -> Unit) {
    val c = SpotterTheme.colors
    val t = SpotterTheme.type
    SpotterCard(onClick = onOpen) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box {
                AvatarTile(chat.initials, c.avatarBg)
                if (chat.online) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .size(14.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(c.bg)
                            .padding(3.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(c.volt),
                    )
                }
            }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(chat.name, style = t.name, color = c.txt, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(chat.whenLabel, style = t.caption, color = c.txt3)
                }
                Spacer(Modifier.height(4.dp))
                Text(chat.last, style = t.bodySm, color = c.txt2, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (chat.unread > 0) {
                Spacer(Modifier.width(10.dp))
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(c.volt),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(chat.unread.toString(), style = t.microBadge.copy(fontSize = 10.sp, fontWeight = FontWeight.W900), color = c.ink)
                }
            }
        }
    }
}
