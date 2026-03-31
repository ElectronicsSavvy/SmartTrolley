import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import BarcodeDisplay from "./BarcodeDisplay";
import toast from "react-hot-toast";
import { Save, RotateCcw, Loader2, Barcode } from "lucide-react";

export default function ProductForm({ editProduct = null, onComplete }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [barcode, setBarcode] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditMode = Boolean(editProduct);

  useEffect(() => {
    if (editProduct) {
      setName(editProduct.name || "");
      setPrice(String(editProduct.price ?? ""));
      setQuantity(String(editProduct.quantity ?? ""));
      setBarcode(editProduct.barcode || "");
    }
  }, [editProduct]);

  // Generate a 12-digit numeric barcode from UUID (fallback option)
  const generateBarcode = () => {
    const uuid = uuidv4().replace(/-/g, "");
    const numericCode = uuid
      .slice(0, 12)
      .split("")
      .map((c) => c.charCodeAt(0) % 10)
      .join("");
    setBarcode(numericCode);
  };

  const resetForm = () => {
    setName("");
    setPrice("");
    setQuantity("");
    setBarcode("");
  };

  // Check if barcode already exists in Firestore
  const checkDuplicateBarcode = async (barcodeValue) => {
    const q = query(collection(db, "products"), where("barcode", "==", barcodeValue));
    const snapshot = await getDocs(q);
    // In edit mode, ignore the current product itself
    if (isEditMode) {
      return snapshot.docs.some((d) => d.id !== editProduct.id);
    }
    return !snapshot.empty;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) return toast.error("Product name is required");
    if (!barcode.trim()) return toast.error("Barcode is required");
    if (!price || Number(price) <= 0) return toast.error("Enter a valid price");
    if (!quantity || Number(quantity) < 0) return toast.error("Enter a valid quantity");

    setSaving(true);

    try {
      // Check for duplicate barcode
      const isDuplicate = await checkDuplicateBarcode(barcode.trim());
      if (isDuplicate) {
        toast.error("This barcode already exists! Use a different one.");
        setSaving(false);
        return;
      }

      const productData = {
        name: name.trim(),
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        barcode: barcode.trim(),
      };

      if (isEditMode) {
        const docRef = doc(db, "products", editProduct.id);
        await updateDoc(docRef, { ...productData, updatedAt: serverTimestamp() });
        toast.success("Product updated!");
      } else {
        await addDoc(collection(db, "products"), {
          ...productData,
          createdAt: serverTimestamp(),
        });
        toast.success("Product added!");
        resetForm();
      }

      onComplete?.();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save. Check Firebase connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Barcode Input */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          <span className="flex items-center gap-1.5">
            <Barcode className="w-4 h-4 text-primary-500" />
            Product Barcode
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Enter your product barcode (e.g. 8901030793585)"
            className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-white text-sm
                       font-mono tracking-wide
                       placeholder:text-text-muted placeholder:font-sans placeholder:tracking-normal
                       focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400
                       transition-colors"
          />
          <button
            type="button"
            onClick={generateBarcode}
            title="Auto-generate barcode"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border
                       text-xs font-medium text-text-muted hover:text-primary-600
                       hover:border-primary-300 hover:bg-primary-50/50
                       transition-colors duration-150 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Auto
          </button>
        </div>
        <p className="text-[11px] text-text-muted mt-1.5">
          Enter your own barcode or click "Auto" to generate one
        </p>
      </div>

      {/* Barcode Preview */}
      {barcode.trim() && (
        <div className="p-3 rounded-lg bg-zinc-50 border border-border">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">
            Barcode Preview
          </p>
          <BarcodeDisplay value={barcode.trim()} height={55} />
          <div className="mt-2 flex items-center justify-center">
            <code className="text-xs font-mono text-text-secondary">
              {barcode}
            </code>
          </div>
        </div>
      )}

      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Product Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Amul Milk 500ml"
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm
                     placeholder:text-text-muted
                     focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400
                     transition-colors"
        />
      </div>

      {/* Price & Quantity */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Price (₹)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm
                       placeholder:text-text-muted
                       focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400
                       transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Quantity
          </label>
          <input
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm
                       placeholder:text-text-muted
                       focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400
                       transition-colors"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                   bg-primary-600 hover:bg-primary-700
                   text-white font-medium text-sm
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors duration-150"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            {isEditMode ? "Update Product" : "Add Product"}
          </>
        )}
      </button>
    </form>
  );
}
