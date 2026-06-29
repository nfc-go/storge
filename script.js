function getWorkspaceId() {
    var match = window.location.hash.match(/workspace=([^&]+)/);
    return match ? match[1] : "default_vault";
}
var currentWS = getWorkspaceId();
var activeFilter = "all";

var StorageEngine = {
    files: [], tier: "Free", quota: 512 * 1024 * 1024,
    init: function() {
        currentWS = getWorkspaceId(); 
        this.files = JSON.parse(localStorage.getItem(currentWS + "_files")) || [];
        this.tier = localStorage.getItem(currentWS + "_tier") || "Free";
        this.quota = this.tier === "Pro" ? 16 * 1024 * 1024 * 1024 : 512 * 1024 * 1024;
    },
    save: function() {
        localStorage.setItem(currentWS + "_files", JSON.stringify(this.files));
        localStorage.setItem(currentWS + "_tier", this.tier);
        UiEngine.render();
    }
};

var AuthEngine = {
    init: function() {
        currentWS = getWorkspaceId();
        var pin = localStorage.getItem(currentWS + "_pin");
        document.getElementById("app-container").classList.add("blurred");
        document.getElementById("modal-overlay-layer").classList.remove("hidden");
        document.getElementById("modal-auth-container").classList.remove("hidden");
        document.getElementById("auth-registration-fields-area").classList.add("hidden");
        
        if (!pin) {
            document.getElementById("auth-registration-fields-area").classList.remove("hidden");
        }
        this.setupInputs();
    },
    setupInputs: function() {
        var pins = [
            document.getElementById("pin-char-1"), document.getElementById("pin-char-2"),
            document.getElementById("pin-char-3"), document.getElementById("pin-char-4")
        ];
        var self = this;
        pins.forEach(function(input, index) {
            if (!input) return;
            input.value = "";
            input.oninput = function(e) {
                if (e.target.value && index < 3) pins[index + 1].focus();
                if (index === 3) self.verify();
            };
        });
    },
    verify: function() {
        var pinVal = ["pin-char-1", "pin-char-2", "pin-char-3", "pin-char-4"].map(function(id){return document.getElementById(id).value;}).join("");
        if(pinVal.length < 4) return;
        var stored = localStorage.getItem(currentWS + "_pin");
        if (!stored) {
            var name = document.getElementById("auth-reg-username").value || "User";
            localStorage.setItem(currentWS + "_pin", pinVal);
            localStorage.setItem(currentWS + "_profile_name", name);
            this.success();
        } else if (pinVal === stored) {
            this.success();
        } else {
            alert(UiEngine.currentLang === "ar" ? "رمز PIN خاطئ!" : "Wrong PIN!");
            ["pin-char-1", "pin-char-2", "pin-char-3", "pin-char-4"].forEach(function(id){document.getElementById(id).value="";});
            document.getElementById("pin-char-1").focus();
        }
    },
    success: function() {
        document.getElementById("app-container").classList.remove("blurred");
        document.getElementById("modal-overlay-layer").classList.add("hidden");
        document.getElementById("modal-auth-container").classList.add("hidden");
        UiEngine.render();
    }
};

var UiEngine = {
    currentLang: "en",
    init: function() {
        var self = this;
        window.onhashchange = function() { StorageEngine.init(); AuthEngine.init(); self.render(); };

        // ربط أزرار الشريط السفلي (Navigation Tabs) والفلترة للصور والفيديو
        document.querySelectorAll(".nav-tab-item").forEach(function(tab) {
            tab.onclick = function(e) {
                if (this.id === "sidebar-upgrade-btn") return; // تجاهل زرار الأبجريد هنا
                document.querySelectorAll(".nav-tab-item").forEach(function(t){t.classList.remove("active");});
                this.classList.add("active");
                activeFilter = this.getAttribute("data-target");
                self.render();
            };
        });

        // تشغيل زرار الزائد الوهّاج لرفع الملفات
        document.getElementById("sidebar-upload-btn").onclick = function() { 
            document.getElementById("sidebar-file-input").click(); 
        };
        document.getElementById("sidebar-file-input").onchange = function(e) { 
            self.upload(e.target.files); 
        };

        // فتح وإغلاق صندوق ترقية المساحة بالكود
        document.getElementById("sidebar-upgrade-btn").onclick = function() {
            document.getElementById("modal-overlay-layer").classList.remove("hidden");
            document.getElementById("modal-billing-subscription-container").classList.remove("hidden");
        };
        document.getElementById("billing-close-btn").onclick = function() {
            document.getElementById("modal-billing-subscription-container").classList.add("hidden");
            document.getElementById("modal-overlay-layer").classList.add("hidden");
        };

        // فحص كود التفعيل (نظام البيزنس)
        document.getElementById("billing-payment-simulation-form").onsubmit = function(e) {
            e.preventDefault();
            var enteredCode = document.getElementById("upgrade-promo-code-input").value.trim();
            
            // الكود الحصري لتفعيل الـ PRO
            if(enteredCode.toUpperCase() === "NFCGO2026") {
                StorageEngine.tier = "Pro";
                StorageEngine.quota = 16 * 1024 * 1024 * 1024;
                StorageEngine.save();
                document.getElementById("modal-billing-subscription-container").classList.add("hidden");
                document.getElementById("modal-overlay-layer").classList.add("hidden");
                alert(self.currentLang === "ar" ? "تم تفعيل حساب PRO بنجاح ومضاعفة المساحة لـ 16 جيجا! 👑" : "PRO activated! Space expanded to 16GB 👑");
            } else {
                alert(self.currentLang === "ar" ? "كود التفعيل غير صحيح أو منتهي الصلاحية!" : "Invalid or expired activation code!");
            }
        };

        // تشغيل تبديل المظهر لايت / دارك مود
        document.getElementById("theme-toggle-btn").onclick = function() {
            var body = document.body;
            var icon = document.getElementById("theme-icon");
            if (body.classList.contains("light-mode")) {
                body.classList.remove("light-mode"); body.classList.add("dark-mode");
                icon.className = "fa-solid fa-sun";
            } else {
                body.classList.remove("dark-mode"); body.classList.add("light-mode");
                icon.className = "fa-solid fa-moon";
            }
        };

        // تشغيل اللغة الفورية المظبوطة قانونياً
        document.getElementById("lang-toggle-btn").onclick = function() {
            self.currentLang = self.currentLang === "en" ? "ar" : "en";
            document.documentElement.dir = self.currentLang === "ar" ? "rtl" : "ltr";
            document.documentElement.lang = self.currentLang;
            document.getElementById("lang-indicator").textContent = self.currentLang === "ar" ? "English" : "العربية";
            self.translateUI();
        };
    },
    upload: function(files) {
        if (!files.length) return;
        var file = files[0]; var reader = new FileReader();
        reader.onload = function(e) {
            StorageEngine.files.push({ name: file.name, size: file.size, type: file.type, content: e.target.result });
            StorageEngine.save();
        };
        reader.readAsDataURL(file);
    },
    translateUI: function() {
        var isAr = this.currentLang === "ar";
        document.querySelector(".txt-all-files").textContent = isAr ? "الملفات" : "All Files";
        document.querySelector(".txt-photos").textContent = isAr ? "الصور" : "Photos";
        document.querySelector(".txt-videos").textContent = isAr ? "الفيديو" : "Videos";
        document.querySelector(".txt-upgrade-btn").textContent = isAr ? "الترقية" : "Upgrade";
        document.getElementById("explorer-current-title").textContent = isAr ? "مستودع الملفات" : "All Files";
        document.getElementById("empty-title").textContent = isAr ? "مستودعك الآمن فارغ تماماً" : "Your Secure Vault is Empty";
        document.getElementById("empty-subtitle").textContent = isAr ? "اضغط على زر '+' بالأسفل لحماية ورفع أولى ملفاتك الثمينة." : "Tap the '+' button below to secure your first premium asset.";
        
        // ترجمة شاشات الحماية والكود
        document.getElementById("lbl-username").textContent = isAr ? "اسم صاحب الخزنة الشخصية" : "Set Account Owner Name";
        document.getElementById("auth-reg-username").placeholder = isAr ? "الاسم" : "Name";
        document.getElementById("btn-unlock-text").textContent = isAr ? "فتح الحساب والموافقة على الشروط" : "Unlock & Accept Terms";
        document.getElementById("legal-agree-text").textContent = isAr ? "⚠️ بالمتابعة، أنت توافق بالكامل على شروط الاستخدام والإعفاء القانوني." : "⚠️ By continuing, you accept all terms, conditions, and liability exemptions.";
        document.getElementById("legal-box").innerHTML = isAr ? "<strong>الشروط وإخلاء المسؤولية القانونية:</strong> بإنشاء هذه الخزنة الرقمية المشفرة، يقر العميل ويفهم بأن البيانات مخزنة في بيئة محلية معزولة تماماً. لا تتحمل شركة NFC GO أو مطور السيستم أي مسؤولية قانونية أو مدنية عن فقدان البيانات، تلفها، نسيان رمز الـ PIN أو أي اختراق خارجي للجهاز المحمول. حماية البيانات هي مسؤولية المستخدم المطلقة." : "<strong>Terms & Disclaimer:</strong> By creating this vault, you understand that this is a localized, sandboxed zero-knowledge container. NFC GO holds no responsibility for data loss, damage, or unauthorized local device access. You are fully responsible for your PIN.";
        
        document.getElementById("bill-title").textContent = isAr ? "ترقية مساحة التخزين لـ NFC GO PRO" : "Upgrade to NFC GO PRO Space";
        document.getElementById("lbl-card").textContent = isAr ? "أدخل كود التفعيل المميز" : "Enter Premium Activation Code";
        document.getElementById("code-buy-notice").textContent = isAr ? "💡 لشراء كود التفعيل ومضاعفة المساحة، يرجى التواصل مباشرة مع وكيل مبيعات NFC GO." : "💡 To purchase an activation code and expand space, please contact NFC GO Sales Agent directly.";
        document.getElementById("btn-auth-up").textContent = isAr ? "التحقق من الكود وتفعيل الحساب" : "Verify Code & Activate";
        document.getElementById("prop-1").textContent = isAr ? "توسيع مساحة التخزين الفورية لـ 16 جيجابايت" : "Expand Space to 16GB Storage";
        document.getElementById("prop-2").textContent = isAr ? "تفعيل الدخول السحابي المشفر لعدد غير محدود من الخزن" : "Unlock Unlimited Multi-Vault Cloud Access";
    },
    render: function() {
        var grid = document.getElementById("file-explorer-grid"); if (!grid) return;
        grid.querySelectorAll(".explorer-asset-card").forEach(function(c) { c.remove(); });
        
        var filteredFiles = StorageEngine.files.filter(function(f) {
            if (activeFilter === "photos") return f.type.startsWith("image/");
            if (activeFilter === "videos") return f.type.startsWith("video/");
            return true;
        });

        var used = StorageEngine.files.reduce(function(acc, f) { return acc + f.size; }, 0);
        document.getElementById("sidebar-storage-metrics").textContent = (used / (1024 * 1024)).toFixed(1) + " MB / " + (StorageEngine.quota / (1024 * 1024)).toFixed(1) + " MB";
        document.getElementById("sidebar-storage-progress").style.width = Math.min((used / StorageEngine.quota) * 100, 100) + "%";
        
        if (StorageEngine.tier === "Pro") document.getElementById("sidebar-premium-badge").classList.remove("hidden");
        else document.getElementById("sidebar-premium-badge").classList.add("hidden");

        if (filteredFiles.length === 0) { document.getElementById("explorer-empty-state").classList.remove("hidden"); return; }
        document.getElementById("explorer-empty-state").classList.add("hidden");

        filteredFiles.forEach(function(f) {
            var card = document.createElement("div"); card.className = "explorer-asset-card";
            var previewContent = '<i class="fa-solid fa-file-lines" style="font-size:36px;color:var(--text-muted);"></i>';
            if(f.type.startsWith("image/")) {
                previewContent = '<img src="' + f.content + '" style="width:100%;height:100%;object-fit:cover;">';
            } else if(f.type.startsWith("video/")) {
                previewContent = '<i class="fa-solid fa-file-video" style="font-size:36px;color:#3b82f6;"></i>';
            }
            card.innerHTML = '<div class="card-preview-surface">' + previewContent + '</div><div><div style="font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + f.name + '</div><div style="font-size:10px; color:var(--text-muted);">' + (f.size / 1024).toFixed(1) + ' KB</div></div>';
            grid.appendChild(card);
        });
    }
};

setTimeout(function() {
    StorageEngine.init();
    UiEngine.init();
    AuthEngine.init();
}, 200);
