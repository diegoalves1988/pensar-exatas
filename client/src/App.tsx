import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Questions from "./pages/Questions";
import Portfolio from "./pages/Portfolio";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminQuestions from "./pages/AdminQuestions";

function Router() {
  return (
    <Switch>
  <Route path={"/"} component={Home} />
  <Route path={"/login"} component={Login} />
  <Route path={"/register"} component={Register} />
      <Route path={"/questoes"} component={Questions} />
      <Route path={"/portfolio"} component={Portfolio} />
      <Route path={"/admin"} component={AdminPanel} />
  <Route path={"/admin/questions"} component={AdminQuestions} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <DashboardLayout>
            <Router />
          </DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

