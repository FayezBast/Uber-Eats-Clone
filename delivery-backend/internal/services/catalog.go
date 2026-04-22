package services

import "strings"

type CatalogService struct {
	restaurants []Restaurant
	index       map[string]Restaurant
}

type Restaurant struct {
	Slug             string        `json:"slug"`
	Name             string        `json:"name"`
	Cuisine          string        `json:"cuisine"`
	PriceLevel       string        `json:"price_level"`
	Rating           float64       `json:"rating"`
	ReviewCount      int           `json:"review_count"`
	DeliveryMinutes  int           `json:"delivery_minutes"`
	DeliveryFeeCents int64         `json:"delivery_fee_cents"`
	Address          string        `json:"address"`
	HeroColor        string        `json:"hero_color"`
	HeroImage        string        `json:"hero_image"`
	Headline         string        `json:"headline"`
	Badges           []string      `json:"badges"`
	Categories       []string      `json:"categories"`
	MenuSections     []MenuSection `json:"menu_sections"`
}

type MenuSection struct {
	ID    string     `json:"id"`
	Name  string     `json:"name"`
	Items []MenuItem `json:"items"`
}

type MenuItem struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	Description      string   `json:"description"`
	PriceCents       int64    `json:"price_cents"`
	Popular          bool     `json:"popular"`
	Tags             []string `json:"tags"`
	CaloriesEstimate int      `json:"calories_estimate"`
	Image            string   `json:"image"`
}

func NewCatalogService() *CatalogService {
	restaurants := mockRestaurants()
	index := make(map[string]Restaurant, len(restaurants))
	for _, restaurant := range restaurants {
		index[restaurant.Slug] = restaurant
	}

	return &CatalogService{
		restaurants: restaurants,
		index:       index,
	}
}

func (s *CatalogService) ListRestaurants(search, category string) []Restaurant {
	search = strings.ToLower(strings.TrimSpace(search))
	category = strings.ToLower(strings.TrimSpace(category))

	results := make([]Restaurant, 0, len(s.restaurants))
	for _, restaurant := range s.restaurants {
		if search != "" && !matchesRestaurantSearch(restaurant, search) {
			continue
		}
		if category != "" && !matchesRestaurantCategory(restaurant, category) {
			continue
		}

		results = append(results, restaurant)
	}

	return results
}

func (s *CatalogService) GetRestaurant(slug string) (Restaurant, bool) {
	restaurant, ok := s.index[strings.ToLower(strings.TrimSpace(slug))]
	return restaurant, ok
}

func (s *CatalogService) FindMenuItem(slug, itemID string) (Restaurant, MenuSection, MenuItem, bool) {
	restaurant, ok := s.GetRestaurant(slug)
	if !ok {
		return Restaurant{}, MenuSection{}, MenuItem{}, false
	}

	for _, section := range restaurant.MenuSections {
		for _, item := range section.Items {
			if item.ID == itemID {
				return restaurant, section, item, true
			}
		}
	}

	return Restaurant{}, MenuSection{}, MenuItem{}, false
}

func matchesRestaurantSearch(restaurant Restaurant, query string) bool {
	haystacks := []string{restaurant.Name, restaurant.Cuisine, restaurant.Headline}
	haystacks = append(haystacks, restaurant.Badges...)
	haystacks = append(haystacks, restaurant.Categories...)

	for _, haystack := range haystacks {
		if strings.Contains(strings.ToLower(haystack), query) {
			return true
		}
	}

	return false
}

func matchesRestaurantCategory(restaurant Restaurant, category string) bool {
	if strings.Contains(strings.ToLower(restaurant.Cuisine), category) {
		return true
	}

	for _, item := range restaurant.Categories {
		if strings.Contains(strings.ToLower(item), category) {
			return true
		}
	}

	return false
}

func mockRestaurants() []Restaurant {
	return []Restaurant{
		{
			Slug:             "cedar-smash-burger",
			Name:             "Cedar Smash Burger",
			Cuisine:          "Burgers",
			PriceLevel:       "$$",
			Rating:           4.8,
			ReviewCount:      1240,
			DeliveryMinutes:  22,
			DeliveryFeeCents: 299,
			Address:          "Verdun Main Street, Beirut",
			HeroColor:        "#b84f2f",
			HeroImage:        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
			Headline:         "Charred patties, crispy potatoes, late-night milkshakes.",
			Badges:           []string{"Popular", "Free drink combo"},
			Categories:       []string{"Burgers", "Comfort", "Late Night"},
			MenuSections: []MenuSection{
				{
					ID:   "signatures",
					Name: "Signature burgers",
					Items: []MenuItem{
						{ID: "smash-double", Name: "Double Cedar Smash", Description: "Two dry-aged beef patties, onion jam, burger sauce, pickles.", PriceCents: 1399, Popular: true, Tags: []string{"Best seller"}, CaloriesEstimate: 890, Image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80"},
						{ID: "truffle-fire", Name: "Truffle Fire Chicken", Description: "Crispy chicken, truffle mayo, hot honey slaw.", PriceCents: 1249, Popular: true, Tags: []string{"Hot"}, CaloriesEstimate: 840, Image: "https://images.unsplash.com/photo-1606755962773-0f3e1f2b9a1b?auto=format&fit=crop&w=900&q=80"},
					},
				},
				{
					ID:   "sides",
					Name: "Sides",
					Items: []MenuItem{
						{ID: "dirty-fries", Name: "Dirty Fries", Description: "Fries with cheddar drizzle, scallions, pepper crunch.", PriceCents: 549, Popular: true, Tags: []string{"Shareable"}, CaloriesEstimate: 540, Image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=900&q=80"},
						{ID: "pickle-slaw", Name: "House Pickle Slaw", Description: "Crunchy cabbage, herbs, dill pickle vinaigrette.", PriceCents: 399, Popular: false, Tags: []string{"Fresh"}, CaloriesEstimate: 180, Image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80"},
					},
				},
			},
		},
		{
			Slug:             "saffron-silk-bowls",
			Name:             "Saffron Silk Bowls",
			Cuisine:          "Mediterranean",
			PriceLevel:       "$$",
			Rating:           4.7,
			ReviewCount:      890,
			DeliveryMinutes:  28,
			DeliveryFeeCents: 349,
			Address:          "Hamra Avenue, Beirut",
			HeroColor:        "#c6932c",
			HeroImage:        "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80",
			Headline:         "Golden grains, grilled proteins, bright herbs.",
			Badges:           []string{"Healthy", "Vegetarian-friendly"},
			Categories:       []string{"Bowls", "Healthy", "Mediterranean"},
			MenuSections: []MenuSection{
				{
					ID:   "bowls",
					Name: "Build your bowl",
					Items: []MenuItem{
						{ID: "chicken-saffron-bowl", Name: "Chicken Saffron Bowl", Description: "Saffron rice, flame-grilled chicken, pickled onion, tahini herb drizzle.", PriceCents: 1299, Popular: true, Tags: []string{"Protein"}, CaloriesEstimate: 710, Image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80"},
						{ID: "falafel-crunch-bowl", Name: "Falafel Crunch Bowl", Description: "Crispy falafel, quinoa tabbouleh, cucumber labneh, chili crisp chickpeas.", PriceCents: 1159, Popular: true, Tags: []string{"Vegetarian"}, CaloriesEstimate: 650, Image: "https://images.unsplash.com/photo-1543332164-6e82f355bad5?auto=format&fit=crop&w=900&q=80"},
					},
				},
				{
					ID:   "meze",
					Name: "Meze extras",
					Items: []MenuItem{
						{ID: "smoked-hummus", Name: "Smoked Paprika Hummus", Description: "Creamy hummus with charred paprika oil and warm pita.", PriceCents: 459, Popular: false, Tags: []string{"Starter"}, CaloriesEstimate: 260, Image: "https://images.unsplash.com/photo-1626200419199-391ae4be7a0f?auto=format&fit=crop&w=900&q=80"},
						{ID: "labneh-dip", Name: "Mint Labneh Dip", Description: "Strained yogurt with mint, lemon zest and olive oil.", PriceCents: 429, Popular: false, Tags: []string{"Cool"}, CaloriesEstimate: 210, Image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=80"},
					},
				},
			},
		},
		{
			Slug:             "tokyo-afterglow",
			Name:             "Tokyo Afterglow",
			Cuisine:          "Japanese",
			PriceLevel:       "$$$",
			Rating:           4.9,
			ReviewCount:      1570,
			DeliveryMinutes:  31,
			DeliveryFeeCents: 399,
			Address:          "Mar Mikhael, Beirut",
			HeroColor:        "#253750",
			HeroImage:        "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
			Headline:         "Neon sushi rolls, yakiniku rice, midnight ramen.",
			Badges:           []string{"Top rated", "Chef curated"},
			Categories:       []string{"Sushi", "Asian", "Premium"},
			MenuSections: []MenuSection{
				{
					ID:   "rolls",
					Name: "Signature rolls",
					Items: []MenuItem{
						{ID: "afterglow-roll", Name: "Afterglow Roll", Description: "Salmon, crispy shrimp, avocado, miso caramel glaze.", PriceCents: 1649, Popular: true, Tags: []string{"Chef special"}, CaloriesEstimate: 610, Image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=900&q=80"},
						{ID: "neon-tuna-roll", Name: "Neon Tuna Crunch", Description: "Spicy tuna, tempura flakes, pickled jalapeno, wasabi aioli.", PriceCents: 1549, Popular: true, Tags: []string{"Spicy"}, CaloriesEstimate: 590, Image: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=80"},
					},
				},
				{
					ID:   "warm",
					Name: "Warm plates",
					Items: []MenuItem{
						{ID: "yakiniku-rice", Name: "Yakiniku Rice Plate", Description: "Soy-glazed beef, sesame rice, blistered greens.", PriceCents: 1499, Popular: false, Tags: []string{"Comfort"}, CaloriesEstimate: 760, Image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80"},
						{ID: "midnight-ramen", Name: "Midnight Tonkotsu", Description: "Slow broth, noodles, shiitake, scallion oil.", PriceCents: 1399, Popular: true, Tags: []string{"Late night"}, CaloriesEstimate: 830, Image: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=900&q=80"},
					},
				},
			},
		},
		{
			Slug:             "melt-club-pizza",
			Name:             "Melt Club Pizza",
			Cuisine:          "Pizza",
			PriceLevel:       "$$",
			Rating:           4.6,
			ReviewCount:      960,
			DeliveryMinutes:  26,
			DeliveryFeeCents: 259,
			Address:          "Gemmayzeh Street, Beirut",
			HeroColor:        "#8b2f2a",
			HeroImage:        "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
			Headline:         "Fermented crusts, molten cheese, spicy pepper drizzle.",
			Badges:           []string{"Group order", "2-for-1 slices"},
			Categories:       []string{"Pizza", "Italian", "Comfort"},
			MenuSections: []MenuSection{
				{
					ID:   "pies",
					Name: "Whole pies",
					Items: []MenuItem{
						{ID: "vodka-pie", Name: "Pink Vodka Pie", Description: "Vodka tomato sauce, mozzarella, basil snow.", PriceCents: 1799, Popular: true, Tags: []string{"Creamy"}, CaloriesEstimate: 1260, Image: "https://images.unsplash.com/photo-1548365328-9f547fb0953c?auto=format&fit=crop&w=900&q=80"},
						{ID: "pepper-heat", Name: "Pepper Heat Pie", Description: "Pepperoni cups, chili honey, roasted garlic oil.", PriceCents: 1899, Popular: true, Tags: []string{"Spicy"}, CaloriesEstimate: 1340, Image: "https://images.unsplash.com/photo-1511689660979-10d2b1aada49?auto=format&fit=crop&w=900&q=80"},
					},
				},
				{
					ID:   "bites",
					Name: "Bites",
					Items: []MenuItem{
						{ID: "garlic-knots", Name: "Parmesan Garlic Knots", Description: "Six pull-apart knots with whipped ricotta dip.", PriceCents: 599, Popular: true, Tags: []string{"Side"}, CaloriesEstimate: 430, Image: "https://images.unsplash.com/photo-1511689660979-10d2b1aada49?auto=format&fit=crop&w=900&q=80"},
						{ID: "caesar-crisp", Name: "Little Gem Caesar", Description: "Crisp lettuce, anchovy crumb, lemon parmesan dressing.", PriceCents: 559, Popular: false, Tags: []string{"Fresh"}, CaloriesEstimate: 250, Image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80"},
					},
				},
			},
		},
		{
			Slug:             "atlas-taco-lab",
			Name:             "Atlas Taco Lab",
			Cuisine:          "Mexican",
			PriceLevel:       "$$",
			Rating:           4.7,
			ReviewCount:      740,
			DeliveryMinutes:  24,
			DeliveryFeeCents: 289,
			Address:          "Badaro Garden District, Beirut",
			HeroColor:        "#1f5f57",
			HeroImage:        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
			Headline:         "Street tacos, smoked salsas, bright citrus rice.",
			Badges:           []string{"Fast delivery", "Taco Tuesday energy"},
			Categories:       []string{"Mexican", "Street Food", "Wraps"},
			MenuSections: []MenuSection{
				{
					ID:   "tacos",
					Name: "Tacos",
					Items: []MenuItem{
						{ID: "birria-trio", Name: "Birria Taco Trio", Description: "Three beef birria tacos with consommé and queso.", PriceCents: 1329, Popular: true, Tags: []string{"Best seller"}, CaloriesEstimate: 780, Image: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=900&q=80"},
						{ID: "baja-fish", Name: "Baja Fish Taco Pair", Description: "Crispy white fish, chipotle crema, cabbage lime slaw.", PriceCents: 1149, Popular: true, Tags: []string{"Seafood"}, CaloriesEstimate: 560, Image: "https://images.unsplash.com/photo-1611250188496-e966043a0629?auto=format&fit=crop&w=900&q=80"},
					},
				},
				{
					ID:   "extras",
					Name: "Extras",
					Items: []MenuItem{
						{ID: "elote-cup", Name: "Smoky Elote Cup", Description: "Charred corn, cotija, lime crema, tajin.", PriceCents: 479, Popular: true, Tags: []string{"Snack"}, CaloriesEstimate: 310, Image: "https://images.unsplash.com/photo-1606756790138-261d2b21cd75?auto=format&fit=crop&w=900&q=80"},
						{ID: "hibiscus-soda", Name: "Hibiscus Cola", Description: "Sparkling hibiscus cola with citrus zest.", PriceCents: 259, Popular: false, Tags: []string{"Drink"}, CaloriesEstimate: 130, Image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80"},
					},
				},
			},
		},
		{
			Slug:             "velvet-noodle-bar",
			Name:             "Velvet Noodle Bar",
			Cuisine:          "Asian Fusion",
			PriceLevel:       "$$",
			Rating:           4.5,
			ReviewCount:      1120,
			DeliveryMinutes:  29,
			DeliveryFeeCents: 329,
			Address:          "Downtown Beirut Arcade",
			HeroColor:        "#59307d",
			HeroImage:        "https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=1200&q=80",
			Headline:         "Glossy noodles, wok flames, mochi-finished desserts.",
			Badges:           []string{"Wok-fired", "Night owl favorite"},
			Categories:       []string{"Noodles", "Asian", "Dessert"},
			MenuSections: []MenuSection{
				{
					ID:   "wok",
					Name: "Wok-fired noodles",
					Items: []MenuItem{
						{ID: "black-pepper-udon", Name: "Black Pepper Udon", Description: "Thick udon, pepper soy glaze, mushrooms, crispy shallots.", PriceCents: 1279, Popular: true, Tags: []string{"Savory"}, CaloriesEstimate: 760, Image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80"},
						{ID: "chili-sesame-lo-mein", Name: "Chili Sesame Lo Mein", Description: "Hand-pulled noodles with sesame chili crunch and pak choi.", PriceCents: 1199, Popular: false, Tags: []string{"Spicy"}, CaloriesEstimate: 700, Image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=900&q=80"},
					},
				},
				{
					ID:   "dessert",
					Name: "Dessert finish",
					Items: []MenuItem{
						{ID: "matcha-mochi", Name: "Matcha Mochi Sundae", Description: "Matcha soft serve, toasted rice crumble, mochi bites.", PriceCents: 529, Popular: true, Tags: []string{"Dessert"}, CaloriesEstimate: 360, Image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80"},
					},
				},
			},
		},
	}
}
