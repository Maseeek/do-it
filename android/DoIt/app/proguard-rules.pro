# Add project specific ProGuard rules here.
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keep class com.doit.app.model.** { *; }
-keep class com.doit.app.data.remote.** { *; }
-keep class com.doit.app.data.local.entity.** { *; }
