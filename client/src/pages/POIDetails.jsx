import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { locationAPI } from "../services/api";

const POIDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [poi, setPoi] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPOI();
  }, [id]);

  const loadPOI = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await locationAPI.getById(id);
      if (response.success) {
        setPoi(response.data);
      } else {
        setError('POI not found');
      }
    } catch (err) {
      console.error('Error loading POI:', err);
      setError('Failed to load POI details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading POI details...</p>
        </div>
      </div>
    );
  }

  if (error || !poi) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || "Location not found"}</p>
          <button
            type="button"
            className="mt-4 rounded-md bg-blue-600 px-3 py-2 text-white"
            onClick={() => navigate("/map")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button
        type="button"
        className="inline-flex items-center text-sm text-blue-700"
        onClick={() => navigate("/map")}
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to map
      </button>
      <div className="mt-4 rounded-xl border bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">{poi.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{poi.category}</p>
        <p className="mt-4 text-sm text-slate-700">{poi.description}</p>
        <div className="mt-4 space-y-1 text-sm text-slate-600">
          <p>Address: {poi.address}</p>
          <p>Hours: {poi.hours}</p>
          {poi.phone && <p>Phone: {poi.phone}</p>}
          <p>
            Map position: {poi.x != null && poi.y != null ? `${poi.x}, ${poi.y}` : "Not mapped"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default POIDetails;

