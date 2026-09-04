<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { ShoppingCart, X, PackageOpen, Camera } from 'lucide-vue-next';
import { formatPrice } from '@/lib/utils';
import { useCashier } from '@/composables/useCashier';
import Skeleton from '@/components/ui/Skeleton.vue';
import ProductFilterCard from '@/components/common/ProductFilterCard.vue';
import ReceiptModal from '@/components/common/ReceiptModal.vue';
import ProductCard from '@/components/kasir/ProductCard.vue';
import CartItemRow from '@/components/kasir/CartItemRow.vue';
import CheckoutPanel from '@/components/kasir/CheckoutPanel.vue';

const BarcodeScannerModal = defineAsyncComponent(
  () => import('@/components/common/BarcodeScannerModal.vue')
);

const {
  cart,
  printer,
  isLoadingProducts,
  searchQuery,
  selectedCategory,
  filteredProducts,
  showMobileCart,
  showScannerModal,
  showReceipt,
  lastReceiptData,
  payAmount,
  finalAmount,
  qtyStep,
  updatePackQty,
  updatePieceQty,
  addToCart,
  processPayment,
  printNow,
  connectPrinter,
  handleBarcodeScanned,
} = useCashier();
</script>

<template>
  <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
    <section class="space-y-4 lg:col-span-7">
      <ProductFilterCard
        v-model:search="searchQuery"
        v-model:category="selectedCategory"
        inputId="cashier-search-product"
      >
        <template #action>
          <button
            type="button"
            @click="showScannerModal = true"
            title="Scan Barcode / SKU Kamera"
            class="neo-press border-ink bg-brand text-ink shadow-hard-xs absolute right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-2 font-bold"
          >
            <Camera class="h-4 w-4" />
          </button>
        </template>
      </ProductFilterCard>

      <Skeleton v-if="isLoadingProducts" type="card" :count="6" />

      <!-- Empty State -->
      <div
        v-else-if="filteredProducts.length === 0"
        class="border-ink bg-surface rounded-2xl border-2 p-10 text-center"
      >
        <PackageOpen class="text-ink/30 mx-auto mb-2 h-10 w-10" />
        <p class="text-sm font-bold">Tidak ada produk ditemukan.</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        <ProductCard
          v-for="p in filteredProducts"
          :key="p.id"
          :product="p"
          @add="(qty, isPiece) => addToCart(p, qty, isPiece)"
        />
      </div>
    </section>

    <aside
      class="border-ink bg-surface shadow-hard-lg sticky top-24 hidden h-[calc(100vh-150px)] flex-col justify-between rounded-2xl border-2 p-4 lg:col-span-5 lg:flex"
    >
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="border-ink mb-3 flex items-center justify-between border-b-2 pb-3">
          <h2 class="flex items-center gap-2 text-base font-extrabold">
            <ShoppingCart class="text-brand h-5 w-5" /> Keranjang Belanja
          </h2>
          <button
            v-if="cart.items.length"
            type="button"
            @click="
              cart.clearCart();
              payAmount = 0;
            "
            class="text-card-coral cursor-pointer text-xs font-bold hover:underline"
          >
            Reset
          </button>
        </div>

        <div
          v-if="cart.items.length === 0"
          class="flex flex-1 flex-col items-center justify-center py-6 text-center text-gray-500"
        >
          <ShoppingCart class="text-ink/20 mx-auto mb-2 h-10 w-10" />
          <p class="text-ink text-sm font-bold">Keranjang masih kosong</p>
          <p class="text-ink/50 mt-0.5 text-xs">Pilih produk sembako dari katalog produk.</p>
        </div>

        <div v-else class="neo-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 pb-2">
          <CartItemRow
            v-for="it in cart.items"
            :key="it.product.id"
            :item="it"
            @increase="cart.increaseQty(it.product.id, qtyStep(it))"
            @decrease="cart.decreaseQty(it.product.id, qtyStep(it))"
            @remove="cart.removeFromCart(it.product.id)"
            @update-pack="updatePackQty(it, $event)"
            @update-piece="updatePieceQty(it, $event)"
          />
        </div>
      </div>

      <!-- Desktop Checkout Panel -->
      <CheckoutPanel
        :subtotal="cart.subtotal"
        :final-amount="finalAmount"
        :pay-amount="payAmount"
        :is-printer-connected="printer.isConnected.value"
        :is-printer-supported="printer.isSupported.value"
        :printer-device-name="printer.deviceName.value"
        :has-items="cart.items.length > 0"
        id-prefix="desktop-checkout"
        @update:pay-amount="payAmount = $event"
        @process-payment="processPayment"
        @connect-printer="connectPrinter"
      />
    </aside>

    <!-- Mobile floating cart bar -->
    <div
      v-if="cart.items.length > 0"
      class="bg-ink shadow-hard-lg fixed inset-x-3 bottom-18 z-40 flex items-center justify-between rounded-2xl border-2 border-white p-3 text-white lg:hidden"
    >
      <div>
        <p class="text-[10px] font-bold tracking-wider text-gray-300 uppercase">
          {{ cart.totalItems }} Item dalam Keranjang
        </p>
        <p class="text-offline text-base font-black">Rp {{ formatPrice(finalAmount) }}</p>
      </div>
      <button
        type="button"
        @click="showMobileCart = true"
        class="neo-press bg-brand hover:bg-brand-hover flex cursor-pointer items-center gap-1.5 rounded-xl border border-white px-4 py-2.5 text-xs font-extrabold uppercase"
      >
        <ShoppingCart class="h-4 w-4" /> Lihat
      </button>
    </div>

    <!-- Mobile bottom sheet -->
    <div
      v-if="showMobileCart"
      class="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 lg:hidden"
      @click.self="showMobileCart = false"
    >
      <div
        class="border-ink bg-surface shadow-hard-xl flex max-h-[92dvh] flex-col rounded-t-3xl border-x-2 border-t-2 p-4"
      >
        <div class="border-ink mb-2 flex shrink-0 items-center justify-between border-b-2 pb-2.5">
          <h2 class="flex items-center gap-2 text-base font-extrabold">
            <ShoppingCart class="text-brand h-5 w-5" /> Keranjang Belanja
          </h2>
          <div class="flex items-center gap-2">
            <button
              v-if="cart.items.length"
              type="button"
              @click="
                cart.clearCart();
                payAmount = 0;
              "
              class="text-card-coral cursor-pointer text-xs font-bold hover:underline"
            >
              Reset
            </button>
            <button
              type="button"
              @click="showMobileCart = false"
              class="cursor-pointer p-1 text-gray-600"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
        </div>

        <div class="neo-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 pr-1">
          <div
            v-if="cart.items.length === 0"
            class="flex flex-col items-center justify-center py-8 text-center text-gray-500"
          >
            <ShoppingCart class="text-ink/20 mx-auto mb-2 h-10 w-10" />
            <p class="text-ink text-sm font-bold">Keranjang masih kosong</p>
            <p class="text-ink/50 mt-0.5 text-xs">Pilih produk sembako dari katalog produk.</p>
          </div>

          <div v-else class="space-y-2.5">
            <div class="space-y-2">
              <CartItemRow
                v-for="it in cart.items"
                :key="it.product.id"
                :item="it"
                @increase="cart.increaseQty(it.product.id, qtyStep(it))"
                @decrease="cart.decreaseQty(it.product.id, qtyStep(it))"
                @remove="cart.removeFromCart(it.product.id)"
                @update-pack="updatePackQty(it, $event)"
                @update-piece="updatePieceQty(it, $event)"
              />
            </div>

            <!-- Mobile Checkout Panel -->
            <CheckoutPanel
              :subtotal="cart.subtotal"
              :final-amount="finalAmount"
              :pay-amount="payAmount"
              :is-printer-connected="printer.isConnected.value"
              :is-printer-supported="printer.isSupported.value"
              :printer-device-name="printer.deviceName.value"
              :has-items="cart.items.length > 0"
              id-prefix="mobile-checkout"
              @update:pay-amount="payAmount = $event"
              @process-payment="processPayment"
              @connect-printer="connectPrinter"
            />
          </div>
        </div>
      </div>
    </div>

    <ReceiptModal
      :open="showReceipt"
      :data="lastReceiptData"
      @close="showReceipt = false"
      @print="printNow"
    />

    <BarcodeScannerModal
      :open="showScannerModal"
      @close="showScannerModal = false"
      @scan="handleBarcodeScanned"
    />
  </div>
</template>
