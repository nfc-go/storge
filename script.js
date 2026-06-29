// FUNCTION TO GET WORKSPACE ID FROM URL
function getWorkspaceId() {
    var match = window.location.hash.match(/workspace=([^&]+)/);
    return match ? match[1] : "default_vault";
}

var currentWS = getWorkspaceId();

// 1. STORAGE SYSTEM
var StorageEngine = {
    files: [],
    tier: "Free",
    quota: 512 * 1024 * 1024,
    init: function() {
        currentWS = getWorkspaceId(); 
        this.files = JSON.parse(localStorage.getItem(currentWS + "_files")) || [];
        this.tier = localStorage.getItem(currentWS + "_tier") || "Free";
        this.quota = this.tier === "Pro" ? 16 * 1024 * 1024 * 1024 : 512 * 1024 * 1024;
    },
    save: function() {
        localStorage.setItem(currentWS + "_files", JSON.stringify(this.files));
        localStorage.setItem(currentWS + "_tier", this.tier);
        if (window.UiEngine) window.UiEngine.render();
    }
};

// 2. AUTH SECURITY
var AuthEngine = {
    isAuthed: false,
    init: function() {
        currentWS = getWorkspaceId();
        var pin = localStorage.getItem(currentWS + "_pin");
        
        document.getElementById("app-container").classList.add("blurred");
        document.getElementById("modal-overlay-layer").classList.remove("hidden");
        document.getElementById("modal-auth-container").classList.remove("hidden");
        
        document.getElementById("auth-registration-fields-area").classList.add("hidden");
        ["pin-char-1", "pin-char-2", "pin-char-3", "pin-char-4"].forEach(function(id) {
            document.getElementById(id).value = "";
        });

        if (!pin) {
            document.getElementById("auth-registration-fields-area").classList.remove("hidden");
            document.getElementById("auth-reg-username").value = "";
        }
        this.setupInputs();
    },
    setupInputs: function() {
        var pins = [
            document.getElementById("pin-char-1"), 
            document.getElementById("pin-char-2"), 
            document.getElementById("pin-char-3"), 
            document.getElementById("pin-char-4")
        ];
        var self = this;
        pins.forEach(function(input, index) {
            if (!input) return;
            
            // Re-bind fresh events smoothly
            input.oninput = function(e) {
                if (e.target.value && index < 3) pins[index + 1].focus();
                if (index === 3) self.verify();
            };
        });

        // Setup Submit Form for Click or Enter Button
        document.getElementById("auth-execution-form").onsubmit = function(e) {
            e.preventDefault();
            self.verify();
        };
    },
    verify: function() {
        var pinVal = ["pin-char-1", "pin-char-2", "pin-char-3", "pin-char-4"].map(function(id) {
            return document.getElementById(id).value;
        }).join("");
        
        if(pinVal.length < 4) {
            alert("Please enter a 4-digit PIN");
            return;
        }

        var stored = localStorage.getItem(currentWS + "_pin");
        
        if (!stored) {
            var name = document.getElementById("auth-reg-username").value || "User";
            localStorage.setItem(currentWS + "_pin", pinVal);
            localStorage.setItem(currentWS + "_profile_name", name);
            this.success(name);
        } else if (pinVal === stored) {
            this.success(localStorage.getItem(currentWS + "_profile_name"));
        } else {
            alert("Wrong PIN for this Vault!");
            ["pin-char-1", "pin-char-2", "pin-char-3", "pin-char-4"].forEach(function(id) {
                document.getElementById(id).value = "";
            });
            document.getElementById("pin-char-1").focus();
        }
    },
    success: function(name) {
        this.isAuthed = true;
        document.getElementById("app-container").classList.remove("blurred");
        document.getElementById("modal-overlay-layer").classList.add("hidden");
        document.getElementById("modal-auth-container").classList.add("hidden");
        document.getElementById("dropdown-user-name").textContent = name;
        UiEngine.render();
    }
};

// 3. UI GENERATOR AND BUTTONS FIX
var UiEngine = {
    init: function() {
        var self = this;
        
        window.addEventListener("hashchange", function() {
            StorageEngine.init();
            AuthEngine.init();
            self.render();
        });

        // Fixed Upload Button Trigger
        document.getElementById("sidebar-upload-btn").onclick = function() {
            document.getElementById("sidebar-file-input").click();
        };
        
        document.getElementById("sidebar-file-input").onchange = function(e) {
            self.upload(e.target.files);
        };

        // Fixed Upgrade Popup Open Trigger
        document.getElementById("sidebar-upgrade-btn").onclick = function() {
            document.getElementById("modal-overlay-layer").classList.remove("hidden");
            document.getElementById("modal-billing-subscription-container").classList.remove("hidden");
        };

        // Fixed Upgrade Popup Close Trigger
        document.getElementById("billing-close-btn").onclick = function() {
            document.getElementById("modal-billing-subscription-container").classList.add("hidden");
            document.getElementById("modal-overlay-layer").classList.add("hidden");
        };

        // Fixed Payment Simulated Submit
        document.getElementById("billing-payment-simulation-form").onsubmit = function(e) {
            e.preventDefault();
            StorageEngine.tier = "Pro";
            StorageEngine.quota = 16 * 1024 * 1024 * 1024;
            StorageEngine.save();
            document.getElementById("modal-billing-subscription-container").classList.add("hidden");
            document.getElementById("modal-overlay-layer").classList.add("hidden");
            alert("Upgraded to PRO successfully!");
        };
    },
    upload: function(files) {
        if (!files.length) return;
        var file = files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            StorageEngine.files.push({
                name: file.name,
                size: file.size,
                type: file.type,
                content: e.target.result
            });
            StorageEngine.save();
        };
        reader.readAsDataURL(file);
    },
    render: function() {
        var grid = document.getElementById("file-explorer-grid");
        if (!grid) return;
        
        grid.querySelectorAll(".explorer-asset-card").forEach(function(c) { 
            c.remove(); 
        });
        
        var used = StorageEngine.files.reduce(function(acc, f) { 
            return acc + f.size; 
        }, 0);
        
        document.getElementById("sidebar-storage-metrics").textContent = (used / (1024 * 1024)).toFixed(1) + " MB / " + (StorageEngine.quota / (1024 * 1024)).toFixed(1) + " MB";
        document.getElementById("sidebar-storage-progress").style.width = Math.min((used / StorageEngine.quota) * 100, 100) + "%";
        
        if (StorageEngine.tier === "Pro") {
            document.getElementById("sidebar-premium-badge").classList.remove("hidden");
        } else {
            document.getElementById("sidebar-premium-badge").classList.add("hidden");
        }

        if (StorageEngine.files.length === 0) {
            document.getElementById("explorer-empty-state").classList.remove("hidden");
            return;
        }
        document.getElementById("explorer-empty-state").classList.add("hidden");

        StorageEngine.files.forEach(function(f) {
            var card = document.createElement("div");
            card.className = "explorer-asset-card";
            
            var previewContent = f.type.startsWith("image/") ? '<img src="' + f.content + '" style="width:100%;height:100%;object-fit:cover;">' : '<i class="fa-solid fa-file-lines" style="font-size:40px;"></i>';
            
            card.innerHTML = '<div class="card-preview-surface">' + previewContent + '</div>' +
                '<div class="card-meta-container-block">' +
                    '<div class="card-metadata-row">' +
                        '<span class="asset-title-text">' + f.name + '</span>' +
                        '<span class="asset-size-subtext">' + (f.size / 1024).toFixed(1) + ' KB</span>' +
                    '</div>' +
                '</div>';
            grid.appendChild(card);
        });
    }
};

// RUN ALL SYSTEMS ONCE LOADED
setTimeout(function() {
    StorageEngine.init();
    UiEngine.init();
    AuthEngine.init();
}, 200);
