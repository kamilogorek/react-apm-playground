import React, { Profiler } from "react";
import * as Sentry from "@sentry/browser";

import {
  unstable_subscribe as subscribe,
  unstable_unsubscribe as unsubscribe
} from "scheduler/tracing";

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || "Component";
}

export default function SentryProfiler(WrappedComponent) {
  return class extends React.Component {
    constructor(...args) {
      super(...args);
      subscribe(this.schedulerSubscriber);
    }

    componentWillUnmount() {
      unsubscribe(this.schedulerSubscriber);
    }

    schedulerSubscriber = {
      onInteractionTraced: interaction => {
        console.log(`onInteractionTraced: ${interaction.id}`);
      },
      onInteractionScheduledWorkCompleted: interaction => {
        const finishTimestamp = +new Date();
        console.log(`onInteractionScheduledWorkCompleted: ${interaction.id}`);
        console.log(
          `Start: ${
            interaction.timestamp
          }, End: ${finishTimestamp}, Duration: ${finishTimestamp -
            interaction.timestamp}ms`
        );
        interaction.finishTimestamp = finishTimestamp;
      },
      onWorkCanceled: () => {},
      onWorkScheduled: () => {},
      onWorkStarted: () => {},
      onWorkStopped: () => {}
    };

    onRender(
      id, // the "id" prop of the Profiler tree that has just committed
      phase, // either "mount" (if the tree just mounted) or "update" (if it re-rendered)
      actualDuration, // time spent rendering the committed update
      baseDuration, // estimated time to render the entire subtree without memoization
      startTime, // when React began rendering this update
      commitTime, // when React committed this update
      interactions // the Set of interactions belonging to this update
    ) {
      // NOTE: We are only interested in updates that were caused by the things we actually track
      if (phase === "update" && interactions.size === 0) {
        return;
      }

      console.log(
        `id: ${id}`,
        `\nphase: ${phase}`,
        `\nactualDuration: ${actualDuration}`,
        `\nbaseDuration: ${baseDuration}`,
        `\nstartTime: ${startTime}`,
        `\ncommitTime: ${commitTime}`,
        `\ninteractions: ${interactions.size}`
      );

      console.log(interactions);

      // const past = performance.now();
      // NOTE: Use either initial render trigger or first interaction timestamp, whatever was first
      const startTimestamp = Array.from(interactions)
        .map(v => v.timestamp)
        .reduce((a, b) => {
          return b < a ? b : a;
        }, +new Date() - parseInt(actualDuration, 10));

      const transaction = Sentry.startSpan({
        transaction: id,
        op: "render",
        description: `${phase} <${getDisplayName(WrappedComponent)}>`
      });
      transaction.startTimestamp = startTimestamp / 1000;

      // NOTE: This manual spans creation can skew the results a bit, but we could use `performance.now` to mitigate this
      // NOTE: `finishTimestamp` is not attached to the interaction in the subscriber at this point
      // we need to wait for another event loop, which makes it even slightly worse, but bearable
      setTimeout(() => {
        if (interactions.size > 0) {
          interactions.forEach(interaction => {
            const span = transaction.child({
              op: interaction.name
            });
            span.finish();
            // NOTE: This overrides shouldn't be necessary, but there's no other way around this
            span.startTimestamp = interaction.timestamp / 1000;
            span.timestamp = interaction.finishTimestamp / 1000;
          });
        }

        // NOTE: this timeDiff should be extracted from the transaction timing to get accurate result
        // however we are not able to override `timestamp` of transaction span after we call `finish`

        // NOTE: This is part of manual spans time-skew fix, but right now it's not usable due to `timestamp` being non-overwriteable
        // const present = performance.now();
        // We operate in ms, and performance.now is is us
        // const timeDiff = parseInt(present - past, 10);
        transaction.finish();
      });

      return;
    }
    render() {
      return (
        <Profiler
          id={getDisplayName(WrappedComponent)}
          onRender={this.onRender}
        >
          <WrappedComponent {...this.props} />
        </Profiler>
      );
    }
  };
}
