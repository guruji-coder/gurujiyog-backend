const fs = require("fs");

const delhiAreas = [
  { name: "Connaught Place", coords: [77.209, 28.6139], zip: "110001" },
  { name: "Khan Market", coords: [77.225, 28.6], zip: "110003" },
  { name: "Lajpat Nagar", coords: [77.24, 28.57], zip: "110024" },
  { name: "Greater Kailash", coords: [77.25, 28.55], zip: "110048" },
  { name: "Hauz Khas", coords: [77.2, 28.55], zip: "110016" },
  { name: "South Extension", coords: [77.23, 28.56], zip: "110049" },
  { name: "Defence Colony", coords: [77.245, 28.565], zip: "110024" },
  { name: "Vasant Vihar", coords: [77.16, 28.58], zip: "110057" },
  { name: "Dwarka", coords: [77.05, 28.58], zip: "110078" },
  { name: "Rohini", coords: [77.12, 28.75], zip: "110085" },
  { name: "Pitampura", coords: [77.13, 28.7], zip: "110034" },
  { name: "Janakpuri", coords: [77.08, 28.62], zip: "110058" },
  { name: "Rajouri Garden", coords: [77.1, 28.65], zip: "110027" },
  { name: "Paschim Vihar", coords: [77.09, 28.67], zip: "110063" },
  { name: "Patel Nagar", coords: [77.18, 28.65], zip: "110008" },
  { name: "Karol Bagh", coords: [77.2, 28.65], zip: "110005" },
  { name: "Paharganj", coords: [77.21, 28.64], zip: "110055" },
  { name: "Old Delhi", coords: [77.22, 28.66], zip: "110006" },
  { name: "Chandni Chowk", coords: [77.23, 28.65], zip: "110006" },
  { name: "Civil Lines", coords: [77.24, 28.68], zip: "110054" },
  { name: "Model Town", coords: [77.25, 28.7], zip: "110009" },
  { name: "Kingsway Camp", coords: [77.22, 28.72], zip: "110009" },
  { name: "Mukherjee Nagar", coords: [77.21, 28.71], zip: "110009" },
  { name: "Vijay Nagar", coords: [77.2, 28.7], zip: "110009" },
  { name: "Kamla Nagar", coords: [77.19, 28.68], zip: "110007" },
  { name: "Maurice Nagar", coords: [77.18, 28.69], zip: "110007" },
  { name: "Hudson Lines", coords: [77.17, 28.7], zip: "110007" },
  { name: "Shakti Nagar", coords: [77.16, 28.68], zip: "110007" },
  { name: "Rohtak Road", coords: [77.15, 28.67], zip: "110007" },
  { name: "Rajinder Nagar", coords: [77.14, 28.66], zip: "110060" },
  { name: "Rajendra Place", coords: [77.13, 28.65], zip: "110008" },
  { name: "Rajouri Garden", coords: [77.12, 28.64], zip: "110027" },
  { name: "Tagore Garden", coords: [77.11, 28.63], zip: "110027" },
  { name: "Subhash Nagar", coords: [77.1, 28.62], zip: "110027" },
  { name: "Tilak Nagar", coords: [77.09, 28.61], zip: "110018" },
  { name: "Moti Nagar", coords: [77.08, 28.6], zip: "110015" },
  { name: "Kirti Nagar", coords: [77.07, 28.59], zip: "110015" },
  { name: "Shadipur", coords: [77.06, 28.58], zip: "110008" },
  { name: "Patel Nagar", coords: [77.05, 28.57], zip: "110008" },
  { name: "Rajinder Nagar", coords: [77.04, 28.56], zip: "110060" },
  { name: "Rajendra Place", coords: [77.03, 28.55], zip: "110008" },
  { name: "Rajouri Garden", coords: [77.02, 28.54], zip: "110027" },
  { name: "Tagore Garden", coords: [77.01, 28.53], zip: "110027" },
  { name: "Subhash Nagar", coords: [77.0, 28.52], zip: "110027" },
  { name: "Tilak Nagar", coords: [76.99, 28.51], zip: "110018" },
  { name: "Moti Nagar", coords: [76.98, 28.5], zip: "110015" },
  { name: "Kirti Nagar", coords: [76.97, 28.49], zip: "110015" },
];

const yogaStyles = [
  "Hatha Yoga",
  "Vinyasa Flow",
  "Power Yoga",
  "Ashtanga Yoga",
  "Iyengar Yoga",
  "Kundalini Yoga",
  "Restorative Yoga",
  "Yin Yoga",
  "Bikram Yoga",
  "Jivamukti Yoga",
];

const instructors = [
  "Priya Sharma",
  "Rajesh Kumar",
  "Anita Patel",
  "Vikram Malhotra",
  "Dr. Meera Singh",
  "Riya Sharma",
  "Arjun Mehta",
  "Dr. Anjali Sen",
  "Sneha Reddy",
  "Guru Param",
  "Swami Anand",
  "Lakshmi Devi",
  "Guru Mahesh",
  "Pandit Ram Das",
  "Swami Vivek",
];

const amenities = [
  "parking",
  "showers",
  "lockers",
  "props",
  "mats",
  "towels",
  "water",
  "tea",
  "meditation_room",
  "outdoor_space",
  "ac",
  "heating",
  "music_system",
  "wifi",
  "changing_rooms",
  "kids_room",
  "therapy_room",
];

function generateShala(index, area) {
  const style = yogaStyles[Math.floor(Math.random() * yogaStyles.length)];
  const instructor =
    instructors[Math.floor(Math.random() * instructors.length)];
  const selectedAmenities = amenities.slice(
    0,
    Math.floor(Math.random() * 8) + 5
  );

  return {
    name: `${area.name} Yoga Center`,
    description: `Premium yoga studio in ${area.name} offering ${style.toLowerCase()} and other traditional practices. Modern facilities with experienced instructors.`,
    images: [
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500",
    ],
    address: {
      street: `${Math.floor(Math.random() * 100) + 1} ${area.name}`,
      city: "New Delhi",
      state: "Delhi",
      zipCode: area.zip,
      country: "India",
    },
    location: {
      type: "Point",
      coordinates: [
        area.coords[0] + (Math.random() - 0.5) * 0.02,
        area.coords[1] + (Math.random() - 0.5) * 0.02,
      ],
    },
    phone: `+91-9876543${String(index).padStart(3, "0")}`,
    email: `info@${area.name.toLowerCase().replace(" ", "")}-yoga.com`,
    website: `https://${area.name.toLowerCase().replace(" ", "")}-yoga.com`,
    amenities: selectedAmenities,
    schedule: [
      {
        day: "monday",
        startTime: "06:00",
        endTime: "07:00",
        className: style,
        instructor: instructor,
        capacity: Math.floor(Math.random() * 20) + 15,
        price: Math.floor(Math.random() * 200) + 300,
      },
    ],
    dropInRate: Math.floor(Math.random() * 200) + 300,
    packages: [
      {
        name: `${area.name} Package`,
        classes: Math.floor(Math.random() * 15) + 10,
        price: Math.floor(Math.random() * 2000) + 2000,
        validityDays: Math.floor(Math.random() * 30) + 30,
      },
    ],
    rating: (Math.random() * 1.5 + 3.5).toFixed(1),
    reviewCount: Math.floor(Math.random() * 200) + 50,
    isActive: true,
  };
}

const shalas = delhiAreas.map((area, index) => generateShala(index + 1, area));

fs.writeFileSync("delhi-shalas.json", JSON.stringify(shalas, null, 2));
console.log(`Generated ${shalas.length} yoga shalas around Delhi`);
