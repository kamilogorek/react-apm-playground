import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import * as Sentry from "@sentry/browser";

import { unstable_trace as trace } from "scheduler/tracing";

import NoProfilerComponent from "./NoProfilerComponent";
import SingleInteractionComponent from "./SingleInteractionComponent";
import MultipleInteractionsComponent from "./MultipleInteractionsComponent";

Sentry.init({
  debug: true,
  dsn: "https://14830a963b1e4c20ad90e47289c1fe98@sentry.io/1419836",
  beforeSend(event) {
    console.log(event);
    // return event;
    return null;
  }
});

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <Router>
          <div>
            <nav>
              <ul>
                <li>
                  <Link to="/">NoProfilerComponent</Link>
                </li>
                <li>
                  <Link to="/single">SingleInteraction</Link>
                </li>
                <li>
                  <Link to="/multiple">MultipleInteractions</Link>
                </li>
              </ul>
            </nav>

            <Switch>
              <Route path="/single">
                <SingleInteractionComponent />
              </Route>
              <Route path="/multiple">
                <MultipleInteractionsComponent />
              </Route>
              <Route path="/">
                <NoProfilerComponent />
              </Route>
            </Switch>
          </div>
        </Router>
      </div>
    );
  }
}

// NOTE: No idea why it shows as an interaction during initial "update" state of child components - it shouldn't
trace("AppRender", +new Date(), () =>
  ReactDOM.render(<App />, document.getElementById("root"))
);
