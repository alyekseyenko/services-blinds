import { describe, it, expect } from 'vitest';
import { ServiceItemSchema } from '../schemas';

describe('ServiceItem Validation', () => {
  it('should validate a correct service item', () => {
    const validItem = {
      opportunityId: '123e4567-e89b-12d3-a456-426614174000',
      product: 'Estore Rolo',
      width: 1500,
      height: 2000,
      qty: 2,
      color: 'Branco',
    };

    const result = ServiceItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it('should reject an item with negative dimensions', () => {
    const invalidItem = {
      opportunityId: '123e4567-e89b-12d3-a456-426614174000',
      product: 'Estore Rolo',
      width: -100, // Invalid
      height: 2000,
      qty: 2,
    };

    const result = ServiceItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Width must be positive');
    }
  });

  it('should require a product name', () => {
    const invalidItem = {
      opportunityId: '123e4567-e89b-12d3-a456-426614174000',
      product: '', // Empty
      width: 1000,
      height: 2000,
      qty: 2,
    };

    const result = ServiceItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
  });
});
