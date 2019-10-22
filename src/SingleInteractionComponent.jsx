import React from "react";
import {
  unstable_trace as trace,
  unstable_wrap as wrap
} from "scheduler/tracing";

import SentryProfiler from "./SentryProfiler";

// NOTE: This is the only "correctly" behaving scenario
class SingleInteractionComponent extends React.Component {
  state = {
    limit: 10,
    todos: []
  };

  fetchTodos = async () => {
    const setTodos = wrap(todos => this.setState({ todos }));

    let todos = await fetch("https://jsonplaceholder.typicode.com/todos").then(
      async res => {
        const data = await res.json();
        return data.slice(0, this.state.limit);
      }
    );

    return new Promise(resolve => {
      setTimeout(resolve, Math.max(Math.random() * 2000, 500));
    }).then(() => setTodos(todos));
  };

  componentDidMount() {
    trace("fetchTodos", +new Date(), this.fetchTodos);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.limit !== this.state.limit) {
      trace("fetchTodos", +new Date(), this.fetchTodos);
    }
  }

  handleLimitChange = e => {
    this.setState({
      limit: e.target.value
    });
  };

  render() {
    return (
      <div>
        <h2>SingleInteractionComponent</h2>
        <label>
          Limit:{" "}
          <input
            type="number"
            max="200"
            value={this.state.limit}
            onChange={this.handleLimitChange}
          />
        </label>
        <ul>
          {this.state.todos.map(x => (
            <li key={x.id}>{x.title}</li>
          ))}
        </ul>
      </div>
    );
  }
}

export default SentryProfiler(SingleInteractionComponent);
