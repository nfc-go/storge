function getWorkspaceId() {
    var match = window.location.hash.match(/workspace=([^&]+)/);
    return match ? match[1] : "default_vault";
}
var currentWS = getWorkspaceId();
var activeFilter = "all";
var selectedFileIndex = null; // لمتابعة الملف المعروض حالياً

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

        // أزرار التنقل السفلية المحدثة
        document.querySelectorAll(".nav-tab-item").forEach(function(tab) {
            tab.onclick = function() {
                document.querySelectorAll(".nav-tab-item").forEach(function(t){t.classList.remove("active");});
                this.classList.add("active");
                activeFilter = this.getAttribute("data-target");
                self.render();
            };
        });

        document.getElementById("sidebar-upload-btn").onclick = function() { document.getElementById("sidebar-file-input").click(); };
        document.getElementById("sidebar-file-input").onchange = function(e) { self.upload(e.target.files); };

        // تفعيل أو إغلاق نافذة المعرض والـ Lightbox
        document.getElementById("lightbox-close-btn").onclick = function() {
            document.getElementById("modal-preview-lightbox").classList.add("hidden");
            document.getElementById("modal-overlay-layer").classList.add("hidden");
            document.getElementById("lightbox-media-container").innerHTML = ""; // تفريغ الذاكرة
        };

        // زر التحميل الفوري من المعرض داخل الموقع
        document.getElementById("lightbox-download-btn").onclick = function() {
            if (selectedFileIndex === null) return;
            var file = StorageEngine.files[selectedFileIndex];
            var a = document.createElement("a");
            a.href = file.content;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        // زر التبديل للمفضلة (Favorite)
        document.getElementById("lightbox-fav-toggle-btn").onclick = function() {
            if (selectedFileIndex === null) return;
            var file = StorageEngine.files[selectedFileIndex];
            file.isFavorite = !file.isFavorite;
            this.classList.toggle("active", file.isFavorite);
            StorageEngine.save();
        };

        // زر الحذف الفوري من المعرض
        document.getElementById("lightbox-delete-btn").onclick = function() {
            if (selectedFileIndex === null) return;
            if(confirm(self.currentLang === "ar" ? "هل أنت متأكد من حذف هذا الملف نهائياً؟" : "Delete this file permanently?")) {
                StorageEngine.files.splice(selectedFileIndex, 1);
                StorageEngine.save();
                document.getElementById("lightbox-close-btn").click();
            }
        };

        // تشغيل الدارك واللايت مود
        document.getElementById("theme-toggle-btn").onclick = function() {
            var body = document.body; var icon = document.getElementById("theme-icon");
            if (body.classList.contains("light-mode")) {
                body.classList.remove("light-mode"); body.classList.add("dark-mode"); icon.className = "fa-solid fa-sun";
            } else {
                body.classList.remove("dark-mode"); body.classList.add("light-mode"); icon.className = "fa-solid fa-moon";
            }
        };

        // تشغيل اللغة الفورية الحقيقية
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
            StorageEngine.files.push({ name: file.name, size: file.size, type: file.type, content: e.target.result, isFavorite: false });
            StorageEngine.save();
        };
        reader.readAsDataURL(file);
    },
    openLightbox: function(globalIndex) {
        selectedFileIndex = globalIndex;
        var file = StorageEngine.files[globalIndex];
        
        document.getElementById("lightbox-file-title").textContent = file.name;
        var container = document.getElementById("lightbox-media-container");
        container.innerHTML = ""; // مسح القديم

        if(file.type.startsWith("image/")) {
            container.innerHTML = '<img src="' + file.content + '">';
        } else if(file.type.startsWith("video/")) {
            container.innerHTML = '<video src="' + file.content + '" controls autoplay style="max-width:100%; max-height:100%;"></video>';
        } else {
            container.innerHTML = '<div style="text-align:center;"><i class="fa-solid fa-file-lines" style="font-size:60px; color:#94a3b8; margin-bottom:10px;"></i><div>' + file.name + '</div></div>';
        }

        var favBtn = document.getElementById("lightbox-fav-toggle-btn");
        favBtn.classList.toggle("active", !!file.isFavorite);

        document.getElementById("modal-overlay-layer").classList.remove("hidden");
        document.getElementById("modal-preview-lightbox").classList.remove("hidden");
    },
    translateUI: function() {
        var isAr = this.currentLang === "ar";
        document.querySelector(".txt-all-files").textContent = isAr ? "الملفات" : "All Files";
        document.querySelector(".txt-photos").textContent = isAr ? "الصور" : "Photos";
        document.querySelector(".txt-videos").textContent = isAr ? "الفيديو" : "Videos";
        document.querySelector(".txt-nav-upgrade").textContent = isAr ? "الترقية" : "Upgrade";
        document.querySelector(".txt-favs").textContent = isAr ? "المفضلة" : "Favorites";
        document.getElementById("explorer-current-title").textContent = isAr ? "مستودع الملفات" : "All Files";
        document.getElementById("empty-title").textContent = isAr ? "مستودعك الآمن فارغ تماماً" : "Your Secure Vault is Empty";
        document.getElementById("empty-subtitle").textContent = isAr ? "اضغط على زر '+' بالأسفل لحماية ورفع أولى ملفاتك الثمينة." : "Tap the '+' button below to secure your first premium asset.";
        
        document.querySelector(".txt-lightbox-fav").textContent = isAr ? "المفضلة" : "Favorite";
        document.querySelector(".txt-lightbox-dl").textContent = isAr ? "تحميل" : "Download";
        document.querySelector(".txt-lightbox-del").textContent = isAr ? "حذف" : "Delete";
    },
    render: function() {
        var self = this;
        var grid = document.getElementById("file-explorer-grid"); if (!grid) return;
        grid.querySelectorAll(".explorer-asset-card").forEach(function(c) { c.remove(); });
        
        // تصفية الفئات والفلترة (الملفات، الصور، الفيديو، المفضلة)
        var filteredIndices = [];
        StorageEngine.files.forEach(function(f, idx) {
            if (activeFilter === "photos" && f.type.startsWith("image/")) filteredIndices.push(idx);
            else if (activeFilter === "videos" && f.type.startsWith("video/")) filteredIndices.push(idx);
            else if (activeFilter === "favorites" && f.isFavorite) filteredIndices.push(idx);
            else if (activeFilter === "all") filteredIndices.push(idx);
        });

        var used = StorageEngine.files.reduce(function(acc, f) { return acc + f.size; }, 0);
        document.getElementById("sidebar-storage-metrics").textContent = (used / (1024 * 1024)).toFixed(1) + " MB / " + (StorageEngine.quota / (1024 * 1024)).toFixed(1) + " MB";
        document.getElementById("sidebar-storage-progress").style.width = Math.min((used / StorageEngine.quota) * 100, 100) + "%";

        if (filteredIndices.length === 0) { document.getElementById("explorer-empty-state").classList.remove("hidden"); return; }
        document.getElementById("explorer-empty-state").classList.add("hidden");

        filteredIndices.forEach(function(globalIdx) {
            var f = StorageEngine.files[globalIdx];
            var card = document.createElement("div"); card.className = "explorer-asset-card";
            
            // فتح المعرض التفاعلي عند الضغط على الكارت
            card.onclick = function() { self.openLightbox(globalIdx); };

            var previewContent = '<i class="fa-solid fa-file-lines" style="font-size:36px;color:var(--text-muted);"></i>';
            if(f.type.startsWith("image/")) {
                previewContent = '<img src="' + f.content + '" style="width:100%;height:100%;object-fit:cover;">';
            } else if(f.type.startsWith("video/")) {
                previewContent = '<i class="fa-solid fa-file-video" style="font-size:36px;color:#3b82f6;"></i>';
            }
            
            var favHeart = f.isFavorite ? '<div class="card-fav-indicator"><i class="fa-solid fa-heart"></i></div>' : '';

            card.innerHTML = '<div class="card-preview-surface">' + favHeart + previewContent + '</div><div><div style="font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + f.name + '</div><div style="font-size:10px; color:var(--text-muted);">' + (f.size / 1024).toFixed(1) + ' KB</div></div>';
            grid.appendChild(card);
        });
    }
};

setTimeout(function() {
    StorageEngine.init();
    UiEngine.init();
    AuthEngine.init();
}, 200);
