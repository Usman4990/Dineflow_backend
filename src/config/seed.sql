-- seed.sql
-- Run this after schema.sql to populate initial data

-- Seed Users
INSERT INTO users (name, email, address, city, latitude, longitude, password_hash, role) VALUES
('System Admin', 'admin@dineflow.com', 'Islamabad', 'Pakistan', NULL, NULL, '$2a$10$1lryF.Y2RHIUOUbtlJG3jOnoPCk.MURDlAWE.gaFwVPLuZcMRqFwO', 'admin'),
('Sami Customer', 'customer@dineflow.com', 'Islamabad', 'Pakistan', 40.712776, -74.005974, '$2a$10$HbiTjnCMT/vGATpx88P5veypV1Qw695iemYHW9qG4mtb/5/1oIrza', 'customer');

-- Seed Menu Items (32 items across 8 categories)
INSERT INTO menu_items (name, description, price, category, is_available, image_url) VALUES
-- Burgers
('Classic Beef Burger', 'Juicy flame-grilled beef patty with lettuce, tomato, pickles, and our signature sauce on a toasted brioche bun.', 650.00, 'Burgers', true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'),
('Cheese Blast Burger', 'Beef patty stuffed with cheddar cheese, topped with crispy onions and extra cheese sauce.', 750.00, 'Burgers', true, 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=600&q=80'),
('Crispy Chicken Burger', 'Crispy golden fried chicken breast, spicy mayo, and shredded lettuce.', 590.00, 'Burgers', true, 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80'),
('Mushroom Swiss Burger', 'Grilled beef patty topped with sauteed button mushrooms and melted Swiss cheese.', 790.00, 'Burgers', true, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80'),

-- Pizza
('Fajita Sensation Pizza', 'Spicy chicken fajita, onions, bell peppers, tomato paste, and lots of mozzarella cheese.', 1200.00, 'Pizza', true, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80'),
('Chicken Tikka Pizza', 'Tender chicken tikka chunks, red onions, marinara sauce, and melted cheese.', 1150.00, 'Pizza', true, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80'),
('Pepperoni Feast Pizza', 'Double pepperoni slices with extra mozzarella cheese and classic Italian tomato sauce.', 1350.00, 'Pizza', true, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80'),
('Veggie Delight Pizza', 'Bell peppers, mushrooms, black olives, onions, sweetcorn, and fresh tomatoes.', 990.00, 'Pizza', true, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80'),

-- BBQ
('Chicken Tikka Boti', '6 pieces of skewered chicken chunks marinated in spicy yogurt and grilled over charcoal.', 450.00, 'BBQ', true, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80'),
('Malai Boti', 'Tender boneless chicken cubes marinated in cream and mild spices, grilled to perfection.', 550.00, 'BBQ', true, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80'),
('Seekh Kabab', '4 skewers of minced beef mixed with herbs and traditional spices, charcoal grilled.', 480.00, 'BBQ', true, 'https://images.unsplash.com/photo-1628294895518-8f557342fb2f?auto=format&fit=crop&w=600&q=80'),
('Beef Bihari Boti', 'Tender, melt-in-mouth beef strips marinated in a traditional Bihari spice mix.', 620.00, 'BBQ', true, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'),

-- Pakistani
('Chicken Karahi', 'Traditional wok-cooked chicken with ginger, garlic, tomatoes, and green chilies. Serves 2.', 980.00, 'Pakistani', true, 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=600&q=80'),
('Mutton Biryani', 'Fragrant basmati rice layered with tender mutton, aromatic spices, and saffron. Serves 1-2.', 850.00, 'Pakistani', true, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80'),
('Nihari', 'Slow-cooked beef shank stew in a rich aromatic gravy, garnished with ginger and lemon.', 720.00, 'Pakistani', true, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'),
('Special Haleem', 'Slow-cooked blend of grains, lentils, and shredded beef, garnished with fried onions.', 450.00, 'Pakistani', true, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80'),

-- Chinese
('Kung Pao Chicken', 'Stir-fried chicken cubes with peanuts, bell peppers, and dried chilies in a sweet & spicy sauce.', 690.00, 'Chinese', true, 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=600&q=80'),
('Chicken Manchurian', 'Classic fried chicken balls in a sweet, sour, and tangy red gravy.', 650.00, 'Chinese', true, 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=600&q=80'),
('Egg Fried Rice', 'Stir-fried basmati rice cooked with eggs, spring onions, carrots, and soy sauce.', 450.00, 'Chinese', true, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80'),
('Chicken Chow Mein', 'Wok-tossed noodles with shredded chicken and fresh vegetables in a savory dark sauce.', 590.00, 'Chinese', true, 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=600&q=80'),

-- Fast Food
('Classic Club Sandwich', 'Three layers of toasted bread packed with chicken breast, egg, cheese, lettuce, and mayo.', 490.00, 'Fast Food', true, 'https://images.unsplash.com/photo-1524351199679-46cddf530c04?auto=format&fit=crop&w=600&q=80'),
('Zinger Roll', 'Crispy zinger chicken strip wrapped in a soft tortilla with mayo and lettuce.', 320.00, 'Fast Food', true, 'https://images.unsplash.com/photo-1626700051175-6518c4793f4f?auto=format&fit=crop&w=600&q=80'),
('Jumbo French Fries', 'Crispy, golden, salted potato fries served with ketchup and garlic sauce.', 250.00, 'Fast Food', true, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80'),
('Chicken Nuggets', '10 pieces of crispy, golden-fried tempura chicken nuggets with honey mustard.', 380.00, 'Fast Food', true, 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80'),

-- Drinks
('Mint Lemonade', 'Refreshing blend of fresh mint leaves, lemon juice, sugar, and crushed ice.', 180.00, 'Drinks', true, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'),
('Piña Colada', 'Creamy tropical drink made with pineapple juice, coconut milk, and crushed ice.', 250.00, 'Drinks', true, 'https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=600&q=80'),
('Canned Soft Drink', 'Chilled 250ml can of your choice (Cola, Sprite, Fanta).', 100.00, 'Drinks', true, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'),
('Mineral Water', 'Chilled 500ml pure drinking water bottle.', 60.00, 'Drinks', true, 'https://images.unsplash.com/photo-1608885898957-a599fb18ec3d?auto=format&fit=crop&w=600&q=80'),

-- Desserts
('Chocolate Lava Cake', 'Warm chocolate cake with a molten chocolate center, served with vanilla ice cream.', 390.00, 'Desserts', true, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80'),
('Gulab Jamun', '3 pieces of warm, sweet milk-solid dumplings soaked in rosewater syrup.', 220.00, 'Desserts', true, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80'),
('Ice Cream Scoop', 'Two scoops of premium ice cream (Vanilla, Chocolate, or Strawberry).', 180.00, 'Desserts', true, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80'),
('Shahi Kheer', 'Traditional rice pudding cooked slow with milk, cardamom, saffron, and nuts.', 250.00, 'Desserts', true, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80');
