import { ServiceCategory } from '../types';

// Default services for a dry cleaning business
export const defaultServices = [
  {
    name: 'Dry Cleaning',
    description: 'Professional dry cleaning services',
    basePrice: 15.0,
    estimatedDuration: 60,
    category: 'DRY_CLEANING' as ServiceCategory
  },
  {
    name: 'Laundry',
    description: 'Wash, dry, and fold services',
    basePrice: 10.0,
    estimatedDuration: 45,
    category: 'LAUNDRY' as ServiceCategory
  },
  {
    name: 'Alterations',
    description: 'Clothing alterations and repairs',
    basePrice: 20.0,
    estimatedDuration: 90,
    category: 'ALTERATIONS' as ServiceCategory
  }
];

// Default products by service category
export const defaultProducts = {
  DRY_CLEANING: [
    { 
      name: 'Suit', 
      description: 'Full suit dry cleaning', 
      price: 25.0, 
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Dress', 
      description: 'Dress dry cleaning', 
      price: 18.0, 
      imageUrl: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Coat/Jacket', 
      description: 'Coat or jacket dry cleaning', 
      price: 30.0, 
      imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Shirt', 
      description: 'Shirt dry cleaning', 
      price: 8.0, 
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Pants', 
      description: 'Pants dry cleaning', 
      price: 12.0, 
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Blouse', 
      description: 'Blouse dry cleaning', 
      price: 10.0, 
      imageUrl: 'https://images.unsplash.com/photo-1551163943-3f7fb0f951a4?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Sweater', 
      description: 'Sweater dry cleaning', 
      price: 15.0, 
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Tie', 
      description: 'Necktie dry cleaning', 
      price: 6.0, 
      imageUrl: 'https://images.unsplash.com/photo-1513431128679-ff1533c7a58d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    }
  ],
  LAUNDRY: [
    { 
      name: 'Wash & Fold (per lb)', 
      description: 'Wash and fold service per pound', 
      price: 3.5, 
      imageUrl: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Shirt', 
      description: 'Wash and press shirt', 
      price: 5.0, 
      imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Bed Sheets', 
      description: 'Wash bed sheets', 
      price: 15.0, 
      imageUrl: 'https://images.unsplash.com/photo-1566681855366-75c1c5d8e5fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Comforter', 
      description: 'Wash comforter', 
      price: 25.0, 
      imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Towels (set)', 
      description: 'Wash and dry towels', 
      price: 10.0, 
      imageUrl: 'https://images.unsplash.com/photo-1583845112203-29329902332e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Tablecloth', 
      description: 'Wash and press tablecloth', 
      price: 12.0, 
      imageUrl: 'https://images.unsplash.com/photo-1563136060-eed9c802c8e9?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    }
  ],
  ALTERATIONS: [
    { 
      name: 'Hem Pants', 
      description: 'Hem pants to desired length', 
      price: 15.0, 
      imageUrl: 'https://images.unsplash.com/photo-1594750852563-5ed8d0b44ed1?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Take in Shirt', 
      description: 'Take in shirt sides', 
      price: 20.0, 
      imageUrl: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Replace Zipper', 
      description: 'Replace broken zipper', 
      price: 25.0, 
      imageUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Patch Repair', 
      description: 'Repair hole or tear', 
      price: 12.0, 
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Suit Tailoring', 
      description: 'Custom tailoring for suits', 
      price: 75.0, 
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    },
    { 
      name: 'Dress Alterations', 
      description: 'Alterations for dresses', 
      price: 45.0, 
      imageUrl: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
    }
  ]
};
