import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Product,
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';

import { SUPPORT_PRODUCT_CONFIGS, SUPPORT_PRODUCT_IDS, type SupportProductId } from '@/constants/support-products';

const PURCHASED_SUPPORT_PRODUCTS_STORAGE_KEY = '@timecross_purchased_support_products';

type SupportProductRow = {
  id: SupportProductId;
  label: string;
  tier: 'standard' | 'future';
  price: string | null;
  isPurchased: boolean;
  isPurchasing: boolean;
  isDisabled: boolean;
};

function isSupportProductId(value: string): value is SupportProductId {
  return SUPPORT_PRODUCT_IDS.includes(value as SupportProductId);
}

export function useSupportPurchases() {
  const [productsById, setProductsById] = useState<Partial<Record<SupportProductId, Product>>>({});
  const [purchasedProductIds, setPurchasedProductIds] = useState<SupportProductId[]>([]);
  const [purchasingProductId, setPurchasingProductId] = useState<SupportProductId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const persistPurchasedProductIds = useCallback(async (productIds: SupportProductId[]) => {
    try {
      await AsyncStorage.setItem(PURCHASED_SUPPORT_PRODUCTS_STORAGE_KEY, JSON.stringify(productIds));
    } catch (error) {
      console.warn('Failed to persist purchased support products', error);
    }
  }, []);

  const mergePurchasedProductIds = useCallback((productIds: SupportProductId[]) => {
    setPurchasedProductIds((current) => {
      const next = Array.from(new Set([...current, ...productIds]));
      void persistPurchasedProductIds(next);
      return next;
    });
  }, [persistPurchasedProductIds]);

  useEffect(() => {
    let isMounted = true;
    let purchaseUpdatedSubscription: { remove: () => void } | null = null;
    let purchaseErrorSubscription: { remove: () => void } | null = null;

    const initializePurchases = async () => {
      try {
        const storedPurchasedProductIds = await AsyncStorage.getItem(PURCHASED_SUPPORT_PRODUCTS_STORAGE_KEY);

        if (storedPurchasedProductIds && isMounted) {
          const parsedProductIds = JSON.parse(storedPurchasedProductIds) as string[];
          const validProductIds = parsedProductIds.filter(isSupportProductId);
          setPurchasedProductIds(validProductIds);
        }

        purchaseUpdatedSubscription = purchaseUpdatedListener(async (purchase) => {
          if (!isMounted || !isSupportProductId(purchase.productId)) {
            return;
          }

          try {
            await finishTransaction({
              purchase,
              isConsumable: false,
            });
            mergePurchasedProductIds([purchase.productId]);
          } catch (error) {
            console.warn('Failed to finish support purchase transaction', error);
          } finally {
            if (isMounted) {
              setPurchasingProductId(null);
            }
          }
        });

        purchaseErrorSubscription = purchaseErrorListener((error) => {
          if (!isMounted) {
            return;
          }

          console.warn('Support purchase failed', error);
          setPurchasingProductId(null);
        });

        await initConnection();

        const [products, availablePurchases] = await Promise.all([
          fetchProducts({
            skus: [...SUPPORT_PRODUCT_IDS],
            type: 'in-app',
          }),
          getAvailablePurchases(),
        ]);

        if (!isMounted) {
          return;
        }

        const nextProductsById: Partial<Record<SupportProductId, Product>> = {};
        const fetchedProducts = Array.isArray(products) ? products : [];

        for (const product of fetchedProducts) {
          if (product.type === 'in-app' && isSupportProductId(product.id)) {
            nextProductsById[product.id] = product;
          }
        }

        const restoredPurchasedProductIds = availablePurchases
          .map((purchase) => purchase.productId)
          .filter(isSupportProductId);

        setProductsById(nextProductsById);
        mergePurchasedProductIds(restoredPurchasedProductIds);
        setIsUnavailable(Object.keys(nextProductsById).length === 0);
      } catch (error) {
        console.warn('Failed to initialize support purchases', error);

        if (isMounted) {
          setIsUnavailable(true);
          setPurchasingProductId(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initializePurchases();

    return () => {
      isMounted = false;
      purchaseUpdatedSubscription?.remove();
      purchaseErrorSubscription?.remove();
      void endConnection().catch((error) => {
        console.warn('Failed to close support purchase connection', error);
      });
    };
  }, [mergePurchasedProductIds]);

  const supportProducts = useMemo<SupportProductRow[]>(() => {
    const nextProducts: SupportProductRow[] = [];

    for (const productConfig of SUPPORT_PRODUCT_CONFIGS) {
      const product = productsById[productConfig.id];
      const isPurchased = purchasedProductIds.includes(productConfig.id);
      const isPurchasing = purchasingProductId === productConfig.id;
      const isDisabled = isUnavailable || !product || isPurchased || isPurchasing;

      nextProducts.push({
        id: productConfig.id,
        label: productConfig.label,
        tier: productConfig.tier,
        price: isPurchased || !product ? null : product.displayPrice,
        isPurchased,
        isPurchasing,
        isDisabled,
      });
    }

    return nextProducts;
  }, [isUnavailable, productsById, purchasedProductIds, purchasingProductId]);

  const purchaseProduct = useCallback(async (productId: SupportProductId) => {
    const isPurchased = purchasedProductIds.includes(productId);

    if (isPurchased || purchasingProductId) {
      return;
    }

    setPurchasingProductId(productId);

    try {
      await requestPurchase({
        request: {
          apple: {
            sku: productId,
          },
          google: {
            skus: [productId],
          },
        },
        type: 'in-app',
      });
    } catch (error) {
      console.warn('Failed to request support purchase', error);
      setPurchasingProductId(null);
    }
  }, [purchasedProductIds, purchasingProductId]);

  return {
    isLoading,
    isUnavailable,
    supportProducts,
    purchaseProduct,
  };
}
