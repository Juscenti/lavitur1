/**
 * Product Detail Page (PDP) — load product by ?id=, render or show error.
 * Uses fetch directly to backend so PDP works even if api.js/supabase has issues.
 */

(function () {
  "use strict";

  var useProduction = (typeof localStorage !== "undefined" && localStorage.getItem("lavitur_use_production_api") === "1");
  var isLocal = (typeof window !== "undefined" && /^localhost$|^127\.0\.0\.1$/i.test(window.location.hostname));
  var API_BASE = (typeof window !== "undefined" && window.API_BASE) ? window.API_BASE : ((isLocal && !useProduction) ? "http://localhost:5000" : "https://lavitur.onrender.com");
  var WISHLIST_KEY = "lavitur_wishlist";
  var REVIEWS_KEY_PREFIX = "lavitur_reviews_";
  var DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

  function getProductId() {
    var hash = window.location.hash ? window.location.hash.slice(1).trim() : "";
    if (hash) return decodeURIComponent(hash);
    var params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  function formatMoney(amount, currency) {
    currency = currency || "JMD";
    var n = Number(amount == null ? 0 : amount);
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency }).format(n);
    } catch (_) {
      return currency + " " + n.toFixed(2);
    }
  }

  function getWishlistIds() {
    try {
      var raw = localStorage.getItem(WISHLIST_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (_) {
      return new Set();
    }
  }

  function setWishlistIds(ids) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(Array.from(ids)));
  }

  function isWishlisted(id) {
    return getWishlistIds().has(String(id));
  }

  function toggleWishlist(id) {
    var ids = getWishlistIds();
    var sid = String(id);
    if (ids.has(sid)) ids.delete(sid); else ids.add(sid);
    setWishlistIds(ids);
    return ids.has(sid);
  }

  function getReviews(productId) {
    try {
      var raw = localStorage.getItem(REVIEWS_KEY_PREFIX + productId);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function saveReview(productId, review) {
    var list = getReviews(productId);
    list.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: review.name,
      rating: review.rating,
      comment: review.comment,
      date: new Date().toISOString()
    });
    localStorage.setItem(REVIEWS_KEY_PREFIX + productId, JSON.stringify(list));
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function run() {
    var loadingEl = document.getElementById("pdp-loading");
    var errorEl = document.getElementById("pdp-error");
    var contentEl = document.getElementById("pdp-content");
    var pdpImage = document.getElementById("pdp-image");
    var pdpCategory = document.getElementById("pdp-category");
    var pdpTitle = document.getElementById("pdp-title");
    var pdpPrice = document.getElementById("pdp-price");
    var pdpDesc = document.getElementById("pdp-desc");
    var pdpStock = document.getElementById("pdp-stock");
    var addCartBtn = document.getElementById("pdp-add-cart");
    var wishlistBtn = document.getElementById("pdp-wishlist");
    var sizeOptionsEl = document.getElementById("pdp-size-options");
    var sizeHintEl = document.getElementById("pdp-size-hint");
    var quantityInput = document.getElementById("pdp-quantity");
    var qtyMinus = document.getElementById("pdp-qty-minus");
    var qtyPlus = document.getElementById("pdp-qty-plus");
    var galleryThumbs = document.getElementById("pdp-gallery-thumbs");
    var reviewsSection = document.getElementById("pdp-reviews");
    var reviewsSummaryEl = document.getElementById("pdp-reviews-summary");
    var reviewsList = document.getElementById("pdp-reviews-list");
    var reviewForm = document.getElementById("pdp-review-form");
    var reviewName = document.getElementById("pdp-review-name");
    var reviewStars = document.getElementById("pdp-review-stars");
    var reviewRatingHint = document.getElementById("pdp-review-rating-hint");
    var reviewComment = document.getElementById("pdp-review-comment");

    var id = getProductId();
    if (!id || id.trim() === "") {
      if (loadingEl) loadingEl.hidden = true;
      if (contentEl) contentEl.hidden = true;
      if (errorEl) errorEl.hidden = false;
      return;
    }

    var placeholderSvg = "data:image/svg+xml," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect fill="#f1f0ed" width="400" height="500"/><text fill="#999" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14">No image</text></svg>'
    );

    function setImage(el, url) {
      if (!el) return;
      if (!url || url === "") {
        el.src = placeholderSvg;
        return;
      }
      el.src = url;
      el.onerror = function () {
        el.onerror = null;
        el.src = placeholderSvg;
      };
    }

    var url = API_BASE + "/api/products/" + encodeURIComponent(id);
    var isCrossOrigin = false;
    try {
      if (typeof window !== "undefined" && window.location.origin) {
        isCrossOrigin = new URL(url).origin !== window.location.origin;
      }
    } catch (_) {}
    var fetchOpts = { method: "GET", headers: { "Content-Type": "application/json" }, credentials: isCrossOrigin ? "include" : "same-origin" };
    fetch(url, fetchOpts)
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = text ? JSON.parse(text) : null; } catch (_) {}
          if (!res.ok) {
            var err = new Error(data && data.error ? data.error : res.statusText || "Request failed");
            err.status = res.status;
            err.data = data;
            throw err;
          }
          return data;
        });
      })
      .then(function (product) {
        if (loadingEl) loadingEl.hidden = true;
        if (errorEl) errorEl.hidden = true;
        if (contentEl) contentEl.hidden = false;

        document.title = (product.title || "Product") + " – Lavitúr";

        if (pdpCategory) {
          if (product.category_name) {
            pdpCategory.hidden = false;
            pdpCategory.textContent = product.category_name;
            if (product.category_slug) {
              pdpCategory.href = "shop.html?categories=" + encodeURIComponent((product.category_slug || "").toLowerCase());
            }
          } else {
            pdpCategory.hidden = true;
          }
        }

        if (pdpTitle) pdpTitle.textContent = product.title || "Untitled";
        if (pdpPrice) pdpPrice.textContent = formatMoney(product.price, "JMD");
        if (pdpDesc) pdpDesc.textContent = product.description || "No description.";
        var stock = Number(product.stock != null ? product.stock : 0);
        if (pdpStock) pdpStock.textContent = stock > 0 ? "In stock (" + stock + ")" : "Sold out";
        if (addCartBtn) addCartBtn.disabled = stock <= 0;

        var images = (product.images && product.images.length) ? product.images : (product.image_url ? [product.image_url] : []);
        var mainUrl = images[0] || product.image_url || "";
        setImage(pdpImage, mainUrl);
        if (pdpImage) pdpImage.alt = product.title || "";

        if (galleryThumbs) {
          if (images.length > 1) {
            galleryThumbs.hidden = false;
            galleryThumbs.innerHTML = images.map(function (url, i) {
              return '<button type="button" class="pdp-thumb' + (i === 0 ? " active" : "") + '" data-index="' + i + '" aria-label="View image ' + (i + 1) + '"><img src="' + url + '" alt="" loading="lazy" /></button>';
            }).join("");
            galleryThumbs.querySelectorAll(".pdp-thumb").forEach(function (btn) {
              btn.addEventListener("click", function () {
                var idx = parseInt(btn.getAttribute("data-index"), 10);
                setImage(pdpImage, images[idx]);
                if (pdpImage) pdpImage.alt = (product.title ? product.title + " – view " + (idx + 1) : "");
                galleryThumbs.querySelectorAll(".pdp-thumb").forEach(function (t) { t.classList.remove("active"); });
                btn.classList.add("active");
              });
            });
          } else {
            galleryThumbs.hidden = true;
          }
        }

        var sizes = (product.sizes && product.sizes.length) ? product.sizes : DEFAULT_SIZES;
        if (sizeOptionsEl) {
          sizeOptionsEl.innerHTML = sizes.map(function (s) {
            return '<button type="button" class="pdp-size-btn" data-size="' + s + '">' + s + "</button>";
          }).join("");
          var selectedSize = "";
          sizeOptionsEl.querySelectorAll(".pdp-size-btn").forEach(function (btn) {
            btn.addEventListener("click", function () {
              sizeOptionsEl.querySelectorAll(".pdp-size-btn").forEach(function (b) { b.classList.remove("selected"); });
              btn.classList.add("selected");
              selectedSize = btn.getAttribute("data-size");
              if (sizeHintEl) sizeHintEl.textContent = "";
            });
          });
        }

        var maxQty = Math.max(1, Math.min(99, stock));
        if (quantityInput) {
          quantityInput.max = maxQty;
          quantityInput.value = 1;
        }
        if (qtyMinus) {
          qtyMinus.addEventListener("click", function () {
            var v = Math.max(1, parseInt(quantityInput.value, 10) - 1);
            quantityInput.value = v;
          });
        }
        if (qtyPlus) {
          qtyPlus.addEventListener("click", function () {
            var v = Math.min(maxQty, parseInt(quantityInput.value, 10) + 1);
            quantityInput.value = v;
          });
        }

        var wished = isWishlisted(product.id);
        if (wishlistBtn) {
          wishlistBtn.classList.toggle("is-wishlisted", wished);
          var icon = wishlistBtn.querySelector("i");
          if (icon) icon.className = wished ? "fas fa-heart" : "far fa-heart";
          wishlistBtn.addEventListener("click", function () {
            var nowWished = toggleWishlist(product.id);
            wishlistBtn.classList.toggle("is-wishlisted", nowWished);
            var i = wishlistBtn.querySelector("i");
            if (i) i.className = nowWished ? "fas fa-heart" : "far fa-heart";
          });
        }

        if (addCartBtn) {
          addCartBtn.addEventListener("click", function () {
            var sz = (sizeOptionsEl && sizeOptionsEl.querySelector(".pdp-size-btn.selected")) ? sizeOptionsEl.querySelector(".pdp-size-btn.selected").getAttribute("data-size") : "";
            if (sizes.length && !sz) {
              if (sizeHintEl) sizeHintEl.textContent = "Please select a size.";
              return;
            }
            var qty = Math.max(1, Math.min(maxQty, parseInt(quantityInput && quantityInput.value, 10) || 1));
            var cart = [];
            try {
              cart = JSON.parse(localStorage.getItem("cart") || "[]");
            } catch (_) {}
            var key = function (item) { return String(item.id) + (item.size ? ":" + item.size : ""); };
            var existing = cart.find(function (item) { return key(item) === key({ id: product.id, size: sz || undefined }); });
            if (existing) existing.quantity += qty;
            else cart.push(Object.assign({}, product, { quantity: qty, size: sz || null }));
            localStorage.setItem("cart", JSON.stringify(cart));
            addCartBtn.textContent = "Added";
            setTimeout(function () { addCartBtn.textContent = "Add to cart"; }, 1500);
          });
        }

        function renderStars(n) {
          var out = "";
          for (var i = 1; i <= 5; i++) out += i <= n ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
          return out;
        }
        function formatReviewDate(iso) {
          try {
            return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
          } catch (_) { return ""; }
        }

        if (reviewsSection) reviewsSection.hidden = false;
        var selectedRating = 0;

        function renderReviews() {
          var reviews = getReviews(product.id);
          if (reviewsSummaryEl) {
            if (reviews.length === 0) reviewsSummaryEl.textContent = "";
            else {
              var avg = reviews.reduce(function (s, r) { return s + (r.rating || 0); }, 0) / reviews.length;
              reviewsSummaryEl.textContent = reviews.length + " " + (reviews.length === 1 ? "review" : "reviews") + " · " + (Math.round(avg * 10) / 10).toFixed(1) + " ★ average";
            }
          }
          if (reviewsList) {
            if (reviews.length === 0) {
              reviewsList.innerHTML = '<p class="pdp-reviews-empty">No reviews yet. Be the first to leave one.</p>';
            } else {
              reviewsList.innerHTML = reviews.slice().reverse().map(function (r) {
                return '<div class="pdp-review-item"><div class="pdp-review-meta"><span class="pdp-review-name">' + escapeHtml(r.name) + '</span><span class="pdp-review-stars-static">' + renderStars(r.rating) + '</span><span class="pdp-review-date">' + formatReviewDate(r.date) + '</span></div><p class="pdp-review-comment">' + escapeHtml(r.comment) + "</p></div>";
              }).join("");
            }
          }
        }

        if (reviewStars) {
          reviewStars.querySelectorAll(".pdp-star").forEach(function (btn) {
            btn.addEventListener("click", function () {
              selectedRating = parseInt(btn.getAttribute("data-rating"), 10);
              if (reviewRatingHint) reviewRatingHint.hidden = true;
              reviewStars.querySelectorAll(".pdp-star").forEach(function (b, i) {
                var ic = b.querySelector("i");
                if (ic) ic.className = i < selectedRating ? "fas fa-star" : "far fa-star";
              });
            });
          });
        }

        if (reviewForm) {
          reviewForm.addEventListener("submit", function (e) {
            e.preventDefault();
            if (selectedRating < 1) {
              if (reviewRatingHint) reviewRatingHint.hidden = false;
              return;
            }
            if (reviewRatingHint) reviewRatingHint.hidden = true;
            saveReview(product.id, {
              name: (reviewName && reviewName.value) ? reviewName.value.trim() : "",
              rating: selectedRating,
              comment: (reviewComment && reviewComment.value) ? reviewComment.value.trim() : ""
            });
            reviewForm.reset();
            selectedRating = 0;
            if (reviewStars) reviewStars.querySelectorAll(".pdp-star i").forEach(function (i) { i.className = "far fa-star"; });
            renderReviews();
          });
        }

        renderReviews();
      })
      .catch(function (err) {
        if (loadingEl) loadingEl.hidden = true;
        if (contentEl) contentEl.hidden = true;
        if (errorEl) errorEl.hidden = false;
        console.error("PDP fetch failed:", err.message, err.status, err.data);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
