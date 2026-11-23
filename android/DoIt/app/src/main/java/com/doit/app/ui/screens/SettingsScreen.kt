package com.doit.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.doit.app.model.PlayerColorId
import com.doit.app.model.PlayerId
import com.doit.app.ui.theme.*
import com.doit.app.ui.viewmodel.SettingsViewModel

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    ownerColor: Color = PlayerBlue,
    guestColor: Color = PlayerPurple,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val duel by viewModel.activeDuel.collectAsState(initial = null)
    val activePlayerId by viewModel.activePlayerId.collectAsState()

    var showJoinDialog by remember { mutableStateOf(false) }
    var showCreateDialog by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(LinearBg)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Duel Tenancy",
                style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = TextPrimary
            )
        }

        // Duel Invite Card
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(LinearSurface)
                    .border(1.dp, LinearBorder, RoundedCornerShape(12.dp))
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Duel Pair: ${duel?.ownerName ?: "Maciek"} & ${duel?.guestName ?: "Myrna"}",
                            style = Typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                            color = TextPrimary
                        )
                        Text(
                            text = if (duel?.isLocal == true) "Offline-first Local Tenancy" else "Synced with Supabase Cloud",
                            fontSize = 12.sp,
                            color = if (duel?.isLocal == true) PlayerOrange else ParComplete
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Invite Code Box
                duel?.inviteCode?.let { code ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(LinearSurfaceElevated)
                            .border(1.dp, LinearBorderSubtle, RoundedCornerShape(8.dp))
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Invite Code", fontSize = 10.sp, color = TextMuted)
                            Text(
                                text = code,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary,
                                maxLines = 1
                            )
                        }

                        IconButton(
                            onClick = {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                val clip = ClipData.newPlainText("Do It Invite Code", code)
                                clipboard.setPrimaryClip(clip)
                                Toast.makeText(context, "Invite code copied to clipboard", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Copy Code", tint = PlayerBlue)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Action buttons: Create or Join cloud duel
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = { showCreateDialog = true },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                        border = androidx.compose.foundation.BorderStroke(1.dp, LinearBorder)
                    ) {
                        Text("Create Cloud Duel", fontSize = 12.sp)
                    }

                    OutlinedButton(
                        onClick = { showJoinDialog = true },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = PlayerPurple),
                        border = androidx.compose.foundation.BorderStroke(1.dp, PlayerPurple.copy(alpha = 0.5f))
                    ) {
                        Text("Join via Code", fontSize = 12.sp)
                    }
                }
            }
        }

        // Color Customization Card
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(LinearSurface)
                    .border(1.dp, LinearBorder, RoundedCornerShape(12.dp))
                    .padding(16.dp)
            ) {
                Text(
                    text = "Player Accent Color",
                    style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = TextPrimary
                )
                Text(
                    text = "Unlock vibrant colors through Karma and inviting your partner.",
                    fontSize = 12.sp,
                    color = TextMuted
                )

                Spacer(modifier = Modifier.height(14.dp))

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    PlayerColorId.entries.forEach { colorItem ->
                        val pColor = Color(android.graphics.Color.parseColor(colorItem.hexColor))
                        val currentColor = if (activePlayerId == PlayerId.MACIEK) duel?.ownerColor else duel?.guestColor
                        val isSelected = (colorItem.id.equals(currentColor, ignoreCase = true))

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) pColor.copy(alpha = 0.15f) else LinearSurfaceElevated)
                                .border(
                                    1.dp,
                                    if (isSelected) pColor else LinearBorderSubtle,
                                    RoundedCornerShape(8.dp)
                                )
                                .clickable {
                                    viewModel.updatePlayerColor(colorItem)
                                    Toast.makeText(context, "Color set to ${colorItem.displayName}", Toast.LENGTH_SHORT).show()
                                }
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(18.dp)
                                        .clip(CircleShape)
                                        .background(pColor)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = colorItem.displayName,
                                    style = Typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                                    color = TextPrimary
                                )
                            }

                            val requirementText = when {
                                colorItem.requiredInvites > 0 -> "1 Invite required"
                                colorItem.unlockKarma > 0 -> "${colorItem.unlockKarma} Karma required"
                                else -> "Unlocked"
                            }
                            Text(
                                text = requirementText,
                                fontSize = 11.sp,
                                color = if (isSelected) pColor else TextMuted
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = {
                        viewModel.recordInvite()
                        Toast.makeText(context, "Invite recorded! Gold unlocked.", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = PlayerGold)
                ) {
                    Icon(Icons.Default.Share, contentDescription = "Recommend", tint = LinearBg, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Recommend App (Unlock Gold)", color = LinearBg, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        // Health Connect Telemetry Card
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(LinearSurface)
                    .border(1.dp, LinearBorder, RoundedCornerShape(12.dp))
                    .padding(16.dp)
            ) {
                Text(
                    text = "Wearable Automation",
                    style = Typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Automatically verifies Sleep, Steps, and Workout habits via Health Connect telemetry.",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(LinearSurfaceElevated)
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Telemetry Sync", style = Typography.bodyMedium, color = TextPrimary)
                    Text("Enabled", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = ParComplete)
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    // Dialog: Create Cloud Duel
    if (showCreateDialog) {
        var nameInput by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showCreateDialog = false },
            title = { Text("Create Cloud Duel", color = TextPrimary) },
            text = {
                Column {
                    Text("Enter your display name:", fontSize = 12.sp, color = TextSecondary)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = nameInput,
                        onValueChange = { nameInput = it },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        )
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.createCloudDuel(nameInput.trim()) { success, err ->
                            if (success) {
                                Toast.makeText(context, "Duel created!", Toast.LENGTH_SHORT).show()
                                showCreateDialog = false
                            } else {
                                Toast.makeText(context, err ?: "Error creating duel", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                ) {
                    Text("Create")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateDialog = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            },
            containerColor = LinearSurface
        )
    }

    // Dialog: Join Cloud Duel
    if (showJoinDialog) {
        var inviteCodeInput by remember { mutableStateOf("") }
        var guestNameInput by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showJoinDialog = false },
            title = { Text("Join Duel via Invite Code", color = TextPrimary) },
            text = {
                Column {
                    Text("Enter your name and invite code:", fontSize = 12.sp, color = TextSecondary)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = guestNameInput,
                        onValueChange = { guestNameInput = it },
                        label = { Text("Your Display Name") },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        )
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = inviteCodeInput,
                        onValueChange = { inviteCodeInput = it },
                        label = { Text("Invite UUID Code") },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        )
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.acceptCloudDuel(inviteCodeInput.trim(), guestNameInput.trim()) { success, err ->
                            if (success) {
                                Toast.makeText(context, "Joined duel successfully!", Toast.LENGTH_SHORT).show()
                                showJoinDialog = false
                            } else {
                                Toast.makeText(context, err ?: "Error joining duel", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                ) {
                    Text("Join")
                }
            },
            dismissButton = {
                TextButton(onClick = { showJoinDialog = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            },
            containerColor = LinearSurface
        )
    }
}
