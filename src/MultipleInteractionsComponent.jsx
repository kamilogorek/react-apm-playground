import React from "react";
import {
  unstable_trace as trace,
  unstable_wrap as wrap
} from "scheduler/tracing";

import SentryProfiler from "./SentryProfiler";

class RandomChildComponent extends React.Component {
  state = {
    posts: []
  };

  fetchData = async () => {
    const setData = wrap(posts => this.setState({ posts }));

    let posts = await fetch("https://jsonplaceholder.typicode.com/posts").then(
      async res => {
        const data = await res.json();
        return data.slice(0, this.props.limit);
      }
    );

    return new Promise(resolve => {
      setTimeout(resolve, Math.max(Math.random() * 2000, 500));
    }).then(() => setData(posts));
  };

  // NOTE: Despite this being a child component, it's not tracked inside parent update cycle
  componentDidMount() {
    trace("childData", +new Date(), this.fetchData);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.limit !== this.props.limit) {
      trace("childData", +new Date(), this.fetchData);
    }
  }

  render() {
    return (
      <div>
        <h2>Hi</h2>
        <ul>
          {this.state.posts.map(x => (
            <li key={x.id}>{x.title}</li>
          ))}
        </ul>
      </div>
    );
  }
}

class MultipleInteractionsComponent extends React.Component {
  state = {
    limit: 10,
    todos: []
  };

  fetchData = async () => {
    const setData = wrap(todos => this.setState({ todos }));

    let todos = await fetch("https://jsonplaceholder.typicode.com/todos").then(
      async res => {
        const data = await res.json();
        return data.slice(0, this.state.limit);
      }
    );

    return new Promise(resolve => {
      setTimeout(resolve, Math.max(Math.random() * 2000, 500));
    }).then(() => setData(todos));
  };

  componentDidMount() {
    trace("fetchData", +new Date(), this.fetchData);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.limit !== this.state.limit) {
      trace("fetchData", +new Date(), this.fetchData);
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
        <h2>MultipleInteractionsComponent</h2>
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
        {/** NOTE: passing limit as prop will ensure that child will re-render at the same time */}
        <RandomChildComponent limit={this.state.limit} />
      </div>
    );
  }
}

export default SentryProfiler(MultipleInteractionsComponent);
