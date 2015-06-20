/* Main navigation logic */
var w = 1800,
    h = 1000,
    node,
    link,
    root;

var force = d3.layout.force()
    .on('tick', tick)
    .charge(-1500)
    .theta(1)
    .gravity(0.03)
    .linkDistance(function(d) { return d.target._children ? 90 : 80; })
    .linkStrength(1)
    .size([w, h - 160]);

var vis = d3.select('body').append('svg:svg')
    .attr('width', w)
    .attr('height', h);

d3.json('json/welcome.json', function(json) {
    root = json;
    root.fixed = true;
    root.x = w / 2 + 20;
    root.y = h / 2;
    update(true);
});

function update(start) {
  var nodes = flatten(root),   
      links = d3.layout.tree().links(nodes);

  // Restart the force layout.
  force
      .nodes(nodes)
      .links(links)
      .start();

  vis.selectAll("line.link").remove();    
  vis.selectAll(".node").remove();

  // Update the links…
  link = vis.selectAll('line.link')
      .data(links, function(d) { return d.target.id; });

  // Enter any new links.
  link.enter().insert('svg:line', '.node')
      .attr('class', 'link')
      .attr('x1', function(d) { return d.source.x; })
      .attr('y1', function(d) { return d.source.y; })
      .attr('x2', function(d) { return d.target.x; })
      .attr('y2', function(d) { return d.target.y; });

  // Exit any old links.
  link.exit().remove();

  // Update the nodes…
  node = vis.selectAll('circle.node')
      .data(nodes, function(d) { return d.id; })
  
  // Exit any old nodes.
  node.exit().remove();

  node.transition()
      .attr('r', function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 10; });

  // Enter any new nodes.
  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .on("click", click)
      .on("mouseover", controlPanelShow)
      .on("mouseout", controlPanelHide)
      .call(force.drag);
  
  nodeEnter.append("circle")
      .attr("r", function(d) { return d.children ? 4.5 : Math.sqrt(d.size) / 10; })

  nodeEnter.append("image")
      .attr("xlink:href", function(d){return d.imageURL;})
      .attr("class","image")
      .attr("x", -20)
      .attr("y", -20)
      .attr("width",42)
      .attr("height",42);

  node.select("circle")
      .style("fill", color);

  if (start) {
    for (i = 0; i < root.children.length; i++) {
     startClick(root.children[i]);
    }
    startClick(root);
  }   
}

var padding=30, // separation between circles
    radius=15;
function collide(alpha) {
  var nodes = flatten(root)
  var quadtree = d3.geom.quadtree(nodes);
  return function(d) {
    var rb = 2*radius + padding,
        nx1 = d.x - rb,
        nx2 = d.x + rb,
        ny1 = d.y - rb,
        ny2 = d.y + rb;
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y);
          if (l < rb) {
          l = (l - rb) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    });
  };
}

function controlPanelShow(d) {
  $('#hoverNode').css('background-color', 'rgba(23,23,23,0.7)');
  $('#hoverNode').css('opacity', '1.0');
  $('#hoverNode').text(d.description);
}

function controlPanelHide(d) {
  $('#hoverNode').css('background-color', '#000');
  $('#hoverNode').css('opacity', '0.1');
  $('#hoverNode').text('Hover over nodes to see detail. Click blue nodes to expand.');
}

function tick() {
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });
  
  node.attr("transform", function(d) {
    return "translate(" + d.x + "," + d.y + ")"; });

  node.each(collide(0.5));
}

// Color leaf nodes orange, and packages white or blue.
function color(d) {
  return d._children ? '#3182bd' : d.children ? '#c6dbef' : '#fd8d3c';
}

function startClick(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null; 
  }
  update(false);
}

function redirect(d) {
  switch(d.name) {
    case 'Trip Finder':
    case 'PacMan Solvers':
    case 'MapReduce':
    case 'Build a CPU':
    case 'AMPLab':
    case 'Clinical Anatomy':
    case 'FDA Approval':
    case 'PIX Analytics':
    case 'Elasticsearch':
      $('#home-wrapper').fadeOut(1000000).load(d.link).fadeIn(1000000);
    case 'Resume':
    case 'LinkedIn':
    case 'GitHub':
    case 'Email':
      window.location.href = d.link;
  }
}

// Toggle children on click.
function click(d) {
  // try {
  if (d3.event.defaultPrevented) return; // ignore drag
  // } catch(err) {
  //   //
  // }
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    redirect(d);
    d.children = d._children;
    d._children = null;
  }
  update(false);
}

// Returns a list of all nodes under the root.
function flatten(root) {
  var nodes = [], i = 0;

  function recurse(node) {
    if (node.children) node.size = node.children.reduce(function(p, v) { return p + recurse(v); }, 0);
    if (!node.id) node.id = ++i;
    nodes.push(node);
    return node.size;
  }
  root.size = recurse(root);
  return nodes;
}

/* Screen resize */
// TODO: Retain state on screen update (smaller screen only).
// Played around, but pretty difficult to do, and no documentation on this online.
var smallerScreen = false;

$(window).resize(function() {
  if ($(window).height() < 700 || $(window).width() < 1000) {
    var force = d3.layout.force()
      .on('tick', tick)
      .charge(-1500)
      .theta(1)
      .gravity(0.03)
      .linkDistance(function(d) { return d.target._children ? 80 : 70; })
      .linkStrength(1)
      .size([$(window).width(), $(window).height()]);
    
    d3.json('json/welcome.json', function(json) {
        root = json;
        root.fixed = true;
        root.x = $(window).width() / 2 + 160;
        root.y = $(window).height() / 2 + 120;
        update(true);
    });
    smallerScreen = true;
  }
  else if ($(window).height() >= 700 && $(window).width() >= 1000 && smallerScreen) {
    var force = d3.layout.force()
      .on('tick', tick)
      .charge(-1500)
      .theta(1)
      .gravity(0.03)
      .linkDistance(function(d) { return d.target._children ? 90 : 80; })
      .linkStrength(1)
      .size([w, h - 160]);
    
    d3.json('json/welcome.json', function(json) {
        root = json;
        root.fixed = true;
        root.x = w / 2 + 20;
        root.y = h / 2;
        update(true);
    });
    smallerScreen = false;
  }
});


