import { Link } from 'react-router-dom';
import { MapPin, Navigation, Search, Clock, Users, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const Home = () => {
  const features = [
    {
      icon: MapPin,
      title: 'Interactive Campus Map',
      description: 'Explore the campus with our detailed interactive map showing all buildings, facilities, and points of interest.',
    },
    {
      icon: Navigation,
      title: 'Real-time Navigation',
      description: 'Get turn-by-turn directions from your current location to any destination on campus.',
    },
    {
      icon: Search,
      title: 'Smart Search',
      description: 'Quickly find buildings, departments, services, and facilities using our intelligent search feature.',
    },
    {
      icon: Clock,
      title: 'Operating Hours',
      description: 'View current operating hours and contact information for all campus facilities.',
    },
    {
      icon: Users,
      title: 'Accessibility',
      description: 'Find accessible routes and facilities designed for users with mobility needs.',
    },
    {
      icon: Shield,
      title: 'Safety Features',
      description: 'Locate emergency phones, security stations, and well-lit pathways for safe navigation.',
    },
  ];

  const quickLinks = [
    { name: 'Libraries', category: 'library', color: 'bg-purple-100 text-purple-800' },
    { name: 'Dining', category: 'cafeteria', color: 'bg-orange-100 text-orange-800' },
    { name: 'Parking', category: 'parking', color: 'bg-green-100 text-green-800' },
    { name: 'Labs', category: 'lab', color: 'bg-blue-100 text-blue-800' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Navigate Your Campus
            <span className="block text-blue-600">With Confidence</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover buildings, find the shortest routes, and explore everything your campus has to offer 
            with our smart navigation system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/map">
              <Button size="lg" className="w-full sm:w-auto">
                <MapPin className="mr-2 h-5 w-5" />
                Explore Campus Map
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Search className="mr-2 h-5 w-5" />
              Search Locations
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Link key={link.category} to={`/map?category=${link.category}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${link.color} mb-2`}>
                      {link.name}
                    </div>
                    <p className="text-sm text-gray-600">
                      Find all {link.name.toLowerCase()} on campus
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Our Navigation System?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <feature.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Explore?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start navigating your campus today with our comprehensive mapping and navigation tools.
          </p>
          <Link to="/map">
            <Button size="lg" variant="secondary">
              <Navigation className="mr-2 h-5 w-5" />
              Start Navigation
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

