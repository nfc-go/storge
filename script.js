function getWorkspaceId() {
    var match = window.location.hash.match(/workspace=([^&]+)/);
    return match ? match[1] : "default_vault";
}
var currentWS = getWorkspaceId();

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
            input.oninput = function(e) {
                if (e.target.value && index < 3) pins[index + 1].focus();
                if (index === 3) self.verify();
            };
        });
        document.getElementById("auth-execution-form").onsubmit = function(e) {
            e.preventDefault(); self.verify();
        };
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
            alert("Wrong PIN!");
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

        // زرار الرفع والأزرار الأخرى مربوطة مباشرة بدون أي اختفاء لقيم الـ Elements
        document.getElementById("sidebar-upload-btn").onclick = function() { document.getElementById("sidebar-file-input").click(); };
        document.getElementById("sidebar-file-input").onchange = function(e) { self.upload(e.target.files); };
        document.getElementById("sidebar-upgrade-btn").onclick = function() {
            document.getElementById("modal-overlay-layer").classList.remove("hidden");
            document.getElementById("modal-billing-subscription-container").classList.remove("hidden");
        };
        document.getElementById("billing-close-btn").onclick = function() {
            document.getElementById("modal-billing-subscription-container").classList.add("hidden");
            document.getElementById("modal-overlay-layer").classList.add("hidden");
        };
        document.getElementById("billing-payment-simulation-form").onsubmit = function(e) {
            e.preventDefault(); StorageEngine.tier = "Pro"; StorageEngine.quota = 16 * 1024 * 1024 * 1024; StorageEngine.save();
            document.getElementById("modal-billing-subscription-container").classList.add("hidden");
            document.getElementById("modal-overlay-layer").classList.add("hidden");
            alert("Upgraded to PRO!");
        };

        // تشغيل زرار تغيير الـ Theme (Light / Dark)
        document.getElementById("theme-toggle-btn").onclick = function() {
            var body = document.body;
            var icon = document.getElementById("theme-icon");
            if (body.classList.contains("light-mode")) {
                body.classList.remove("light-mode");
                body.classList.add("dark-mode");
                icon.className = "fa-solid fa-sun";
            } else {
                body.classList.remove("dark-mode");
                body.classList.add("light-mode");
                icon.className = "fa-solid fa-moon";
            }
        };

        // تشغيل زرار اللغة والترجمة الفورية لكل عناصر الصفحة
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
        document.querySelector(".txt-upload").textContent = isAr ? "تحميل ملف جديد" : "Upload New";
        document.querySelector(".txt-all-files").textContent = isAr ? "جميع الملفات" : "All Files";
        document.querySelector(".txt-storage-title").textContent = isAr ? "المساحة السحابية" : "Cloud Storage";
        document.querySelector(".txt-upgrade-btn").textContent = isAr ? "ترقية المساحة" : "Upgrade Storage";
        document.getElementById("dashboard-search").placeholder = isAr ? "ابحث عن ملفاتك..." : "Search files...";
        document.getElementById("explorer-current-title").textContent = isAr ? "جميع الملفات" : "All Files";
        document.getElementById("empty-title").textContent = isAr ? "لا توجد ملفات هنا" : "No Files Found Here";
        document.getElementById("empty-subtitle").textContent = isAr ? "المجلد فارغ، قم برفع ملفاتك لحمايتها." : "This folder is empty. Upload new files to secure them.";
        
        // ترجمة الخزنة والشروط
        document.getElementById("lbl-username").textContent = isAr ? "اسم صاحب الحساب" : "Set Account Owner Name";
        document.getElementById("auth-reg-username").placeholder = isAr ? "الاسم" : "Name";
        document.getElementById("btn-unlock-text").textContent = isAr ? "فتح الخزنة والموافقة على الشروط" : "Unlock & Accept Terms";
        document.getElementById("legal-agree-text").textContent = isAr ? "⚠️ بالمتابعة، أنت توافق على جميع الشروط والإعفاءات القانونية." : "⚠️ By continuing, you accept all terms, conditions, and liability exemptions.";
        document.getElementById("legal-box").innerHTML = isAr ? "<strong>الشروط وإخلاء المسؤولية:</strong> بإنشاء هذه الخزنة، أنت تقر بأن هذا مستودع محلي مشفر تماماً. لا يتحمل مطور السيستم أي مسؤولية عن فقدان البيانات أو تلفها أو الدخول غير المصرح به من جهازك. الحفاظ على الـ PIN مسؤوليتك الكاملة." : "<strong>Terms & Disclaimer:</strong> By creating this vault, you understand that this is a localized, sandboxed zero-knowledge container. NFC GO holds no responsibility for data loss, damage, or unauthorized local device access. You are fully responsible for your PIN.";
    },
    render: function() {
        var grid = document.getElementById("file-explorer-grid"); if (!grid) return;
        grid.querySelectorAll(".explorer-asset-card").forEach(function(c) { c.remove(); });
        var used = StorageEngine.files.reduce(function(acc, f) { return acc + f.size; }, 0);
        document.getElementById("sidebar-storage-metrics").textContent = (used / (1024 * 1024)).toFixed(1) + " MB / " + (StorageEngine.quota / (1024 * 1024)).toFixed(1) + " MB";
        document.getElementById("sidebar-storage-progress").style.width = Math.min((used / StorageEngine.quota) * 100, 100) + "%";
        
        if (StorageEngine.tier === "Pro") document.getElementById("sidebar-premium-badge").classList.remove("hidden");
        else document.getElementById("sidebar-premium-badge").classList.add("hidden");

        if (StorageEngine.files.length === 0) { document.getElementById("explorer-empty-state").classList.remove("hidden"); return; }
        document.getElementById("explorer-empty-state").classList.add("hidden");

        StorageEngine.files.forEach(function(f) {
            var card = document.createElement("div"); card.className = "explorer-asset-card";
            var previewContent = f.type.startsWith("image/") ? '<img src="' + f.content + '" style="width:100%;height:100%;object-fit:cover;">' : '<i class="fa-solid fa-file-lines" style="font-size:40px;color:var(--text-muted);"></i>';
            card.innerHTML = '<div class="card-preview-surface">' + previewContent + '</div><div><div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + f.name + '</div><div style="font-size:11px; color:var(--text-muted);">' + (f.size / 1024).toFixed(1) + ' KB</div></div>';
            grid.appendChild(card);
        });
    }
};

setTimeout(function() {
    StorageEngine.init();
    UiEngine.init();
    AuthEngine.init();
}, 200);
