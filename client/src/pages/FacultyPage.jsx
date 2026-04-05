import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { locationAPI } from "../services/api";
import { mapCabinToLocationId, normalizeCampusLocationName } from "../utils/locationNaming";
import { toast } from "sonner";

const facultyData = [
  { name: "Dr. Ami T. Choksi", initials: "ATC", email: "ami.choksi@ckpcet.ac.in", cabin: "D2-101" },
  { name: "Prof. Neelam Parmar", initials: "NNP", email: "neelam.surti@ckpcet.ac.in", cabin: "D1-104(2)" },
  { name: "Prof. Chetan Solanki", initials: "CKS", email: "chetan.solanki@ckpcet.ac.in", cabin: "D1-109" },
  { name: "Dr. Vishruti Desai", initials: "VVD", email: "vishruti.desai@ckpcet.ac.in", cabin: "D1-101" },
  { name: "Dr. Saurabh Tandel", initials: "SST", email: "saurabh.tandel@ckpcet.ac.in", cabin: "D1-207(2)" },
  { name: "Dr. Unnati Shah", initials: "USS", email: "On Deputation", cabin: "-" },
  { name: "Prof. Hemil Patel", initials: "HAP", email: "hemil.patel@ckpcet.ac.in", cabin: "D1-107" },
  { name: "Prof. Nidhi Hadiya", initials: "NRH", email: "nidhi.hadiya@ckpcet.ac.in", cabin: "D1-205" },
  { name: "Prof. Supriya Pati", initials: "SNP", email: "supriya.pati@ckpcet.ac.in", cabin: "D1-201" },
  { name: "Prof. Mithila Parekh", initials: "MDP", email: "mithila.parekh@ckpcet.ac.in", cabin: "D1-104(2)" },
  { name: "Prof. Monali Panchal", initials: "MHP", email: "monali.panchal@ckpcet.ac.in", cabin: "D1-203" },
  { name: "Prof. Parita D Patel", initials: "PDP", email: "parita.d.patel@ckpcet.ac.in", cabin: "D1-203" },
  { name: "Prof. Anal D Shah", initials: "ADS", email: "anali.shah@ckpcet.ac.in", cabin: "D1-203" },
  { name: "Prof. Ankita D Parmar", initials: "ADP", email: "ankita.parmar@ckpcet.ac.in", cabin: "D1-205" },
  { name: "Prof. Priyal D Desai", initials: "PDD", email: "priyal.desai@ckpcet.ac.in", cabin: "D1-205" },
  { name: "Prof. Stephen D Tamakuwala", initials: "SDT", email: "stephanie.noronha@ckpcet.ac.in", cabin: "D1-201" },
  { name: "Prof. Juhi S Mehta", initials: "JSM", email: "juhi.mehta@ckpcet.ac.in", cabin: "D1-205" },
  { name: "Prof. Pooja D Pariyani", initials: "PP", email: "pooja.pariyani@ckpcet.ac.in", cabin: "D1-205" },
  { name: "Prof. Chaitali V Sheth", initials: "CVS", email: "chaitali.sheth@ckpcet.ac.in", cabin: "D1-205" },
  { name: "Prof. Kushal D Patel", initials: "KDP", email: "kushal.patel@ckpcet.ac.in", cabin: "D1-209(2)" },
  { name: "Prof. Rakesh Katariya", initials: "RMK", email: "rakesh.katariya@ckpcet.ac.in", cabin: "D1-107" },
  { name: "Prof. Twinkle P Kosambia", initials: "TPK", email: "twinkle.kosambia@ckpcet.ac.in", cabin: "D1-209(2)" },
  { name: "Prof. Gira R Barot", initials: "GRB", email: "gira.barot@ckpcet.ac.in", cabin: "D1-205" },
];

const FacultyPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [allLocations, setAllLocations] = useState([]);

  useEffect(() => {
    async function loadLocations() {
      try {
        const locRes = await locationAPI.getAll();
        const locations = locRes?.data || locRes || [];
        const parsed = locations
          .map((loc) => ({
            ...loc,
            id: Number(loc.id),
            name: normalizeCampusLocationName(loc.name),
          }))
          .filter((loc) => Number.isSafeInteger(loc.id));
        setAllLocations(parsed);
      } catch {
        setAllLocations([]);
      }
    }

    loadLocations();
  }, []);

  const handleNavigateToCabin = (faculty) => {
    const targetId = mapCabinToLocationId(faculty.cabin);

    if (!targetId) {
      toast.message("Cabin mapping not available for this faculty member.");
      return;
    }

    const target = allLocations.find((loc) => loc.id === targetId);

    if (!target) {
      toast.error("Could not find the mapped destination on the campus map.");
      return;
    }

    navigate("/map", { state: { autoRouteTo: targetId } });
  };

  const filteredFaculty = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return facultyData;

    return facultyData.filter((faculty) => {
      return (
        faculty.name.toLowerCase().includes(term) ||
        faculty.initials.toLowerCase().includes(term) ||
        faculty.cabin.toLowerCase().includes(term)
      );
    });
  }, [search]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Faculty Directory</h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Search faculty by name, initials, or cabin and quickly open navigation.
          </p>
          <div className="relative mt-5 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, initials, or cabin..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="mb-4 text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filteredFaculty.length}</span> of {facultyData.length} faculty members
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFaculty.map((faculty) => (
            <Card key={`${faculty.name}-${faculty.initials}`} className="border-slate-200/80 shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base font-bold leading-tight text-slate-900">
                    {faculty.name}
                  </CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {faculty.initials}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Email
                  </p>
                  {faculty.email.includes("@") ? (
                    <a
                      href={`mailto:${faculty.email}`}
                      className="font-medium text-blue-700 underline-offset-4 hover:underline"
                    >
                      {faculty.email}
                    </a>
                  ) : (
                    <span className="font-medium text-slate-600">{faculty.email}</span>
                  )}
                </div>

                <div className="text-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Cabin
                  </p>
                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                    {faculty.cabin}
                  </Badge>
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleNavigateToCabin(faculty)}
                  aria-label={`Navigate to cabin ${faculty.cabin} for ${faculty.name}`}
                >
                    <Navigation className="mr-2 h-4 w-4" />
                    Navigate to Cabin
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacultyPage;