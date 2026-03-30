import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, X, Phone, MapPin, Minus, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { ProductCard } from "../components/ProductCard";
import { CategoryFilter } from "../components/CategoryFilter";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { fetchAndParseCsv } from "../utils/parseCsv";
import { CATEGORIES } from "../utils/constants";
import { capitalize } from "../utils/text";
import type { Product } from "../types/Product";

const isOutOfStock = (product: Product) => {
  return product.stock?.toLowerCase() === "out of stock";
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sort, setSort] = useState("");
  
  // User Guide States
  const [showGuide, setShowGuide] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalSize, setModalSize] = useState<string | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  
  // Modal Animation State
  const [modalScale, setModalScale] = useState(0.95);
  const [modalOpacity, setModalOpacity] = useState(0);

  // Zoom State
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Suggestions State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchAndParseCsv();
      if (data !== null && data.length > 0) {
        setProducts(data);
      }
    } catch (err) {
      console.log("Fetch failed, keeping old data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 600000);
    return () => clearInterval(interval);
  }, []);

  // Show guide only for first-time users (with checkbox support)
  useEffect(() => {
    const seen = localStorage.getItem("hideGuide");
    if (!seen) {
      setShowGuide(true);
    }
  }, []);

  useEffect(() => {
    const handleClick = () => setShowSuggestions(false);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    setModalSize(null);
    setModalQuantity(1);
  }, [selectedProduct]);

  // Modal Animation Effect
  useEffect(() => {
    if (selectedProduct) {
      // Small delay to allow render, then animate in
      requestAnimationFrame(() => {
        setModalScale(1);
        setModalOpacity(1);
      });
    } else {
      setModalScale(0.95);
      setModalOpacity(0);
    }
  }, [selectedProduct]);

  const bestSellers = useMemo(() => {
    return products.filter(p => p.bestSeller);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;
      if (!matchesCategory) return false;

      const words = searchTerm.toLowerCase().trim().split(" ").filter(w => w.length > 0);
      if (words.length === 0) return true;
      
      return words.every(word =>
        product.name.toLowerCase().includes(word) ||
        product.category.toLowerCase().includes(word) ||
        product.color.toLowerCase().includes(word)
      );
    });

    if (sort === "bestseller") {
      list = [...list].sort((a, b) => {
        if (isOutOfStock(a) && !isOutOfStock(b)) return 1;
        if (!isOutOfStock(a) && isOutOfStock(b)) return -1;
        const aIsBest = a.bestSeller ? 1 : 0;
        const bIsBest = b.bestSeller ? 1 : 0;
        return bIsBest - aIsBest;
      });
    } else if (sort === "price-asc") {
      list = [...list].sort((a, b) => {
        if (isOutOfStock(a) && !isOutOfStock(b)) return 1;
        if (!isOutOfStock(a) && isOutOfStock(b)) return -1;
        return Number(a.price) - Number(b.price);
      });
    } else if (sort === "price-desc") {
      list = [...list].sort((a, b) => {
        if (isOutOfStock(a) && !isOutOfStock(b)) return 1;
        if (!isOutOfStock(a) && isOutOfStock(b)) return -1;
        return Number(b.price) - Number(a.price);
      });
    } else if (sort === "new") {
      list = [...list].sort((a, b) => {
        if (isOutOfStock(a) && !isOutOfStock(b)) return 1;
        if (!isOutOfStock(a) && isOutOfStock(b)) return -1;
        const aIsNew = a.new?.toLowerCase() === "yes";
        const bIsNew = b.new?.toLowerCase() === "yes";
        if (aIsNew && !bIsNew) return -1;
        if (!aIsNew && bIsNew) return 1;
        return 0;
      });
    } else {
      list = [...list].sort((a, b) => {
        if (isOutOfStock(a) && !isOutOfStock(b)) return 1;
        if (!isOutOfStock(a) && isOutOfStock(b)) return -1;
        return 0;
      });
    }

    return list;
  }, [products, searchTerm, selectedCategory, sort]);

  const getModalPrice = () => {
    if (!selectedProduct) return 0;
    
    // If size is selected, get price from sizePrices
    if (modalSize && selectedProduct.sizePrices) {
      const pairs = selectedProduct.sizePrices.split(",");
      for (let pair of pairs) {
        if (!pair.includes(":")) continue;
        let parts = pair.split(":");
        if (parts.length !== 2) continue;
        let size = parts[0].trim().toLowerCase();
        let price = parts[1].trim();
        if (size === modalSize.trim().toLowerCase()) {
          let finalPrice = parseFloat(price);
          return isNaN(finalPrice) ? Number(selectedProduct.price) || 0 : finalPrice;
        }
      }
    }
    
    // Fallback to base price
    return Number(selectedProduct.price) || 0;
  };

  const handleWhatsAppOrder = () => {
    if (!selectedProduct || !modalSize) return;

    const message = `Hi, I want to order:

Product: ${selectedProduct.name}
ID: ${selectedProduct.id}
Color: ${selectedProduct.color}
Size: ${modalSize}
Quantity: ${modalQuantity}
Total: ₹${getModalPrice() * modalQuantity}

Product Image: ${selectedProduct.image}`;
    
    const url = `https://wa.me/918275977677?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);

    if (value.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const suggestionSet = new Set<string>();

    products.forEach(p => {
      if (!p) return;

      if (p.name?.toLowerCase().startsWith(value)) {
        suggestionSet.add(p.name);
      }

      if (p.color?.toLowerCase().startsWith(value)) {
        suggestionSet.add(p.color);
      }

      if (p.category?.toLowerCase().startsWith(value)) {
        suggestionSet.add(p.category);
      }
    });

    setSuggestions(Array.from(suggestionSet).slice(0, 6));
    setShowSuggestions(true);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fb", fontFamily: "'Inter', sans-serif" }}>
      {/* STEP 1: GLOBAL COLORS - Sticky Header */}
      <header 
        style={{ 
          position: "sticky", 
          top: 0, 
          zIndex: 50, 
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e7eb"
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Logo + Tagline */}
            <div>
              <h1 
                style={{ 
                  fontSize: "24px", 
                  fontWeight: "700", 
                  letterSpacing: "0.5px",
                  color: "#e60023",
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                K.Rasee
              </h1>
              <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px", fontWeight: "500", letterSpacing: "0.3px" }}>
                SERVING QUALITY SINCE 2008
              </p>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => window.open("tel:+918275977677")}
                style={{
                  background: "#22c55e",
                  border: "none",
                  borderRadius: "50%",
                  padding: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <Phone size={18} color="white" />
              </button>

              <button
                onClick={() => window.open("https://wa.me/918275977677", "_blank")}
                style={{
                  background: "#25D366",
                  border: "none",
                  borderRadius: "50%",
                  padding: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                  alt="WhatsApp"
                  style={{ width: "20px", height: "20px" }}
                />
              </button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={fetchData} 
                style={{ color: "#6b7280" }}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "16px", fontFamily: "'Inter', sans-serif" }}>
        {loading && products.length === 0 ? (
          <SkeletonLoader />
        ) : products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ color: "#6b7280", fontSize: "18px" }}>No products available</p>
          </div>
        ) : (
          <>
            {/* STEP 4: SEARCH BAR */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShowSuggestions(false);
                    }
                  }}
                  placeholder="Search products..."
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 12px",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#ffffff",
                    color: "#111111",
                    fontSize: "15px",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                    fontFamily: "'Inter', sans-serif"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#e60023"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
                <span 
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.5, cursor: "pointer" }}
                  onClick={() => {
                    setShowSuggestions(false);
                  }}
                >
                  🔍
                </span>

                {showSuggestions && suggestions.length > 0 && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      background: "#ffffff",
                      width: "100%",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      marginTop: "5px",
                      zIndex: 1000,
                      maxHeight: "250px",
                      overflowY: "auto",
                      fontFamily: "'Inter', sans-serif"
                    }}
                  >
                    {suggestions.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setSearchTerm(s);
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          borderBottom: i !== suggestions.length - 1 ? "1px solid #f3f4f6" : "none",
                          fontSize: "14px",
                          color: "#111111",
                          transition: "background 0.2s ease",
                          fontFamily: "'Inter', sans-serif"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fb"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* STEP 3: CATEGORY BUTTONS */}
            <div style={{ marginBottom: "24px" }}>
              <CategoryFilter
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            {/* Products Section */}
            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111111", fontFamily: "'Inter', sans-serif" }}>
                  {selectedCategory === "all" ? "All Products" : capitalize(selectedCategory)}
                  {filteredProducts.length > 0 && (
                    <span style={{ fontSize: "14px", fontWeight: "400", color: "#6b7280", marginLeft: "8px" }}>
                      ({filteredProducts.length})
                    </span>
                  )}
                </h2>

                {/* STEP 5: SORT DROPDOWN */}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#ffffff",
                    fontSize: "14px",
                    cursor: "pointer",
                    color: "#111111",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                    fontFamily: "'Inter', sans-serif"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#e60023"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                >
                  <option value="">Sort</option>
                  <option value="bestseller">⭐ Best Seller</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="new">New Arrivals</option>
                </select>
              </div>

              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>😕</div>
                  <p style={{ color: "#111111", fontSize: "18px", fontWeight: "600", marginBottom: "8px", fontFamily: "'Inter', sans-serif" }}>
                    No products found
                  </p>
                  <p style={{ color: "#9ca3af", fontSize: "14px", fontFamily: "'Inter', sans-serif" }}>
                    Try searching something else
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                  {filteredProducts.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      setSelectedProduct={setSelectedProduct}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* STEP 6: DIVIDER */}
            <div style={{ borderTop: "1px solid #eeeeee", margin: "32px 0" }}></div>

            {/* Visit Store Section */}
            <section style={{ padding: "20px", textAlign: "center" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111111", marginBottom: "12px", fontFamily: "'Inter', sans-serif" }}>
                Visit Our Store
              </h3>
              <a
                href="https://maps.app.goo.gl/n9UAhaNHiD1mpvja9?g_st=ic"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  textDecoration: "none",
                  color: "#6b7280",
                  cursor: "pointer",
                  fontSize: "14px",
                  justifyContent: "center",
                  transition: "color 0.2s ease",
                  fontFamily: "'Inter', sans-serif"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#e60023"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}
              >
                <MapPin size={16} color="#e60023" />
                Section 30 Chowk, Ulhasnagar 4
              </a>
              <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "8px", fontFamily: "'Inter', sans-serif" }}>
                Feel free to visit anytime
              </p>
            </section>
          </>
        )}
      </main>

      {/* STEP 6: POPUP */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
            padding: "16px",
            opacity: modalOpacity,
            transition: "opacity 0.2s ease"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "400px",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
              transform: `scale(${modalScale})`,
              transition: "transform 0.2s ease",
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedProduct(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255,255,255,0.9)",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#6b7280",
                zIndex: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "rotate(90deg)";
                e.currentTarget.style.background = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "rotate(0deg)";
                e.currentTarget.style.background = "rgba(255,255,255,0.9)";
              }}
            >
              <X size={20} />
            </button>

            {/* Product Image */}
            <img 
              src={selectedProduct.image} 
              alt={selectedProduct.name}
              onClick={() => setZoomImage(selectedProduct.image)}
              style={{ 
                width: "100%",
                height: "200px",
                objectFit: "cover",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
                cursor: "pointer"
              }} 
            />

            {/* Content */}
            <div style={{ padding: "16px", gap: "12px", display: "flex", flexDirection: "column" }}>
              {/* Product Info */}
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "4px", lineHeight: "1.3", color: "#111111", fontFamily: "'Inter', sans-serif" }}>
                  {selectedProduct.name}
                </h3>
                <p style={{ fontSize: "14px", color: "#6b7280", fontFamily: "'Inter', sans-serif" }}>
                  {selectedProduct.color}
                </p>
              </div>

              {/* Price - Shows size-specific price when selected, base price otherwise */}
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#111111", fontFamily: "'Inter', sans-serif" }}>
                {modalSize ? `₹${getModalPrice()}` : `₹${selectedProduct.price} onwards`}
              </h2>

              {/* Description */}
              {selectedProduct.description && (
                <p style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  lineHeight: "1.5",
                  fontFamily: "'Inter', sans-serif"
                }}>
                  {selectedProduct.description}
                </p>
              )}

              {/* Size Buttons */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "8px", color: "#111111", fontFamily: "'Inter', sans-serif" }}>
                  Select Size
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectedProduct.size && selectedProduct.size.split(",").map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setModalSize(s.trim())}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "999px",
                        border: modalSize === s.trim() ? "none" : "1px solid #e5e7eb",
                        backgroundColor: modalSize === s.trim() ? "#111111" : "#ffffff",
                        color: modalSize === s.trim() ? "#ffffff" : "#111111",
                        fontSize: "14px",
                        fontWeight: modalSize === s.trim() ? "600" : "400",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontFamily: "'Inter', sans-serif"
                      }}
                      onMouseEnter={(e) => {
                        if (modalSize !== s.trim()) {
                          e.currentTarget.style.transform = "scale(1.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {s.trim()}
                    </button>
                  ))}
                </div>
                {!modalSize && (
                  <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "6px", fontFamily: "'Inter', sans-serif" }}>Please select a size</p>
                )}
              </div>

              {/* Size Chart */}
              {selectedProduct.sizeChart && (
                <div style={{ 
                  padding: "12px", 
                  backgroundColor: "#f8f9fb", 
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb"
                }}>
                  <p style={{ fontSize: "13px", color: "#111111", lineHeight: "1.5", fontFamily: "'Inter', sans-serif" }}>
                    <strong>Size Chart:</strong> {selectedProduct.sizeChart}
                  </p>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "8px", color: "#111111", fontFamily: "'Inter', sans-serif" }}>
                  Quantity
                </label>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                  <button
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                      backgroundColor: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "18px",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#111111"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  >
                    <Minus size={18} />
                  </button>
                  
                  <span style={{ fontSize: "18px", fontWeight: "600", minWidth: "30px", textAlign: "center", color: "#111111", fontFamily: "'Inter', sans-serif" }}>
                    {modalQuantity}
                  </span>
                  
                  <button
                    onClick={() => setModalQuantity(Math.min(5, modalQuantity + 1))}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                      backgroundColor: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "18px",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#111111"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Spacer for sticky button */}
              <div style={{ height: "20px" }}></div>
            </div>

            {/* STEP 7: WHATSAPP BUTTON - IMPROVED DESIGN */}
            <div style={{
              position: "sticky",
              bottom: "0",
              background: "#ffffff",
              padding: "16px",
              borderTop: "1px solid #eeeeee",
              borderBottomLeftRadius: "16px",
              borderBottomRightRadius: "16px"
            }}>
              <button
                onClick={handleWhatsAppOrder}
                disabled={!modalSize}
                style={{
                  background: !modalSize ? "#d1d5db" : "#25D366",
                  color: "#ffffff",
                  padding: "14px",
                  borderRadius: "12px",
                  width: "100%",
                  fontSize: "16px",
                  fontWeight: "600",
                  letterSpacing: "0.3px",
                  border: "none",
                  cursor: !modalSize ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: modalSize ? "0 4px 10px rgba(37,211,102,0.3)" : "none",
                  fontFamily: "'Inter', sans-serif"
                }}
                onMouseEnter={(e) => {
                  if (modalSize) {
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.background = "#1ebc57";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  if (modalSize) {
                    e.currentTarget.style.background = "#25D366";
                  }
                }}
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                  alt="WhatsApp"
                  style={{ width: "20px", height: "20px" }}
                />
                Order on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Zoom */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            opacity: 1,
            transition: "opacity 0.2s ease"
          }}
        >
          <img
            src={zoomImage}
            style={{
              width: "90%",
              maxHeight: "90%",
              objectFit: "contain",
              transform: "scale(1)",
              transition: "transform 0.3s ease"
            }}
          />
        </div>
      )}

      {/* Smart User Guide Popup with Checkbox */}
      {showGuide && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "20px",
            width: "85%",
            maxWidth: "320px",
            fontFamily: "'Inter', sans-serif"
          }}>
            <h3 style={{ marginBottom: "10px", textAlign: "center", fontSize: "18px", fontWeight: "700", color: "#111111" }}>
              How to Order
            </h3>

            <p style={{ fontSize: "14px", color: "#555", lineHeight: "1.6" }}>
              1. Tap any product<br/>
              2. Select size<br/>
              3. Click WhatsApp to order
            </p>

            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "10px",
              fontSize: "13px",
              color: "#6b7280",
              cursor: "pointer"
            }}>
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Never show again
            </label>

            <button
              onClick={() => {
                if (dontShow) {
                  localStorage.setItem("hideGuide", "yes");
                }
                setShowGuide(false);
              }}
              style={{
                marginTop: "15px",
                width: "100%",
                background: "#22c55e",
                color: "#fff",
                border: "none",
                padding: "10px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontFamily: "'Inter', sans-serif"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#16a34a"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#22c55e"}
            >
              Got it 👍
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;