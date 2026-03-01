# dragbizz-subscription — Pending Tasks List

## 🔴 High Priority

### TASK-09 — Missing `PACKAGE_MODULES` filter in Upgrade & Downgrade
- **Files:** `src/services/subscription/subscription.upgrade.service.js` & `src/services/subscription/subscription.downgrade.service.js`
- **Problem:** Humne `subscription.create.service.js` me `PACKAGE_MODULES` ka validation add kiya tha taki only valid modules bypass ho (`processFeatures(...).filter(...)`). Lekin yahi feature validation `upgradeSubscription` aur `downgradeSubscription` me *miss* ho gaya hai. Waha ab bhi purana `processFeatures(newPackage.features)` use ho raha hai bina enum validation filter kay. Agar unfiltered purani features slip through hui, enum validation model me dubara break ho sakta hai jab DB record save perform hoga.
- **Status:** Resolved ✅

*(Note: Pichle sabhi TASK-01 se TASK-08 iss se already successfully resolve aur code me apply kardiye gaye hain.)*
