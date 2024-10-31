import React from 'react';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import cloud from 'd3-cloud';

const GptResponseCloud = ({ text }) => {
  const words = text.split(/\s+/g);
  const fontSizeScale = scaleLinear()
    .domain([0, words.length - 1])
    .range([20, 60]);

  React.useEffect(() => {
    if (!text) return;

    const layout = cloud()
      .size([800, 400])
      .words(words.map((word, index) => ({ text: word, size: fontSizeScale(index) })))
      .padding(5)
      .rotate(() => 0)
      .font("Impact")
      .fontSize(d => d.size)
      .on("end", draw);

    layout.start();

    function draw(words) {
      select("#gpt-response-cloud")
        .select("svg")
        .remove();

      select("#gpt-response-cloud")
        .append("svg")
        .attr("width", layout.size()[0])
        .attr("height", layout.size()[1])
        .append("g")
        .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
        .selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-size", d => d.size + "px")
        .style("font-family", "Impact")
        .attr("text-anchor", "middle")
        .attr("transform", d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
        .text(d => d.text);
    }
  }, [text]);

  return <div id="gpt-response-cloud" style={{ width: '100%', height: '400px' }}></div>;
};

export default GptResponseCloud;