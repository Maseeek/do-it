package com.doit.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.doit.app.model.Habit
import com.doit.app.ui.theme.*

@Composable
fun ProofDialog(
    habit: Habit,
    onDismiss: () -> Unit,
    onSubmitProof: (proofUrl: String, note: String) -> Unit
) {
    var proofUrl by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(LinearSurface)
                .border(1.dp, LinearBorder, RoundedCornerShape(14.dp))
                .padding(20.dp)
        ) {
            Text(
                text = "Attach Proof for ${habit.title}",
                style = Typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Add photo URL or verification note for your partner.",
                fontSize = 12.sp,
                color = TextMuted
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = proofUrl,
                onValueChange = { proofUrl = it },
                label = { Text("Photo URL (optional)") },
                placeholder = { Text("https://...") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = PlayerBlue,
                    unfocusedBorderColor = LinearBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                )
            )

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text("Reflection / Note (optional)") },
                placeholder = { Text("Done! Space cleaned...") },
                maxLines = 3,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = PlayerBlue,
                    unfocusedBorderColor = LinearBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                )
            )

            Spacer(modifier = Modifier.height(18.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(onClick = onDismiss) {
                    Text("Cancel", color = TextSecondary)
                }
                Spacer(modifier = Modifier.width(8.dp))
                Button(
                    onClick = {
                        onSubmitProof(proofUrl.trim(), note.trim())
                        onDismiss()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = PlayerBlue)
                ) {
                    Text("Submit", color = LinearBg, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
