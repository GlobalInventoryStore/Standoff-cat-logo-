
        function aceitarCookiesLgpd() {
            try { localStorage.setItem("marktplace_lgpd_ok", "1"); } catch (e) {}
            var b = document.getElementById("lgpd-banner");
            if (b) b.style.display = "none";
        }
        (function () {
            var aceito = false;
            try { aceito = localStorage.getItem("marktplace_lgpd_ok") === "1"; } catch (e) {}
            if (!aceito) {
                var b = document.getElementById("lgpd-banner");
                if (b) b.style.display = "flex";
            }
        })();
