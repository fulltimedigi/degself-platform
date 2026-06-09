import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

// wouter's useHashLocation includes the query string in the path, which breaks
// route matching for URLs like #/search?q=x. Strip the query for matching only;
// query params are read separately via useHashQuery.
function useHashLocationNoQuery(): [string, (to: string, opts?: any) => void] {
  const [loc, navigate] = useHashLocation();
  const path = loc.split("?")[0] || "/";
  return [path, navigate];
}
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BootGate } from "@/components/BootGate";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import SearchPage from "@/pages/Search";
import WorkshopDetail from "@/pages/WorkshopDetail";
import MapView from "@/pages/MapView";
import About from "@/pages/About";
import Emergency from "@/pages/Emergency";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/workshop/:place_id" component={WorkshopDetail} />
      <Route path="/map" component={MapView} />
      <Route path="/emergency" component={Emergency} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BootGate>
          <Router hook={useHashLocationNoQuery}>
            <AppRouter />
          </Router>
        </BootGate>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
