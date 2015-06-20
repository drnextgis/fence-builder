function Renderer(canvas) {
    this.canvas = new fabric.StaticCanvas(canvas);
    this.group  = new fabric.Group();
};


Renderer.prototype.render = function(fence) {
    this.renderSegments(fence);
    this.renderEntrances(fence);
    this.renderColumns(fence);

    this.renderEntranceLabels(fence);
    this.renderSegmentLabels(fence);

    this.canvas.add(this.group);
    this.canvas.centerObject(this.group);

};


Renderer.prototype.renderSegments = function(fence) {
    var obj,
        renderer = this;

    $.each(fence.edges, function(i, edge) {
        $.each(fence.segments[i], function(j, segment) {
            obj = new fabric.Line([
                segment.x1,
                segment.y1,
                segment.x2,
                segment.y2
            ], {
                stroke: "black",
                strokeWidth: 3,
                hasBorders: false
            });
            renderer.group.addWithUpdate(obj);
        });
    });
};


Renderer.prototype.renderEntrances = function(fence) {
    var obj,
        renderer = this;

    $.each(fence.edges, function(i, edge) {
        $.each(fence.entrances[i], function(j, entrance) {
            obj = new fabric.Line([
                entrance.x1,
                entrance.y1,
                entrance.x2,
                entrance.y2
            ], {
                stroke: "red",
                strokeWidth: 1,
                strokeDashArray: [5, 5],
                hasBorders: false
            });
            renderer.group.addWithUpdate(obj);
        });
    });
};


Renderer.prototype.renderColumns = function(fence) {
    var obj,
        renderer = this;

    $.each(fence.columns, function(i, column) {
        obj = new fabric.Circle({
            top: column.y,
            left: column.x,
            radius: 5,
            stroke: "black",
            strokeWidth: 1,
            fill: (column.type == "regular") ? "white" : "black",
            originY: "center",
            originX: "center",
            hasBorders: false
        });
        renderer.group.addWithUpdate(obj);
    });
};


Renderer.prototype.renderSegmentLabels = function(fence) {
    var edgeLength, el, partSize, ps,
        renderer = this;

    $.each(fence.edges, function(i, edge) {
        edgeLength = "L " + (i + 1) + " = " + edge.length.toFixed(1);
        el = new fabric.Text(edgeLength, {
            left: (edge.x1 + edge.x2)/2,
            top:  (edge.y1 + edge.y2)/2,
            angle: edge.angle,
            fontSize: 12,
            lineHeight: 5,
            originY: "botom",
            originX: "center",
            fontFamily: "arial",
            fontWeight: "bold",
            textDecoration: "underline",
            hasBorders: false
        });
        renderer.group.addWithUpdate(el);
    });

    $.each(fence.parts, function(i, part) {
        partSize = part.length.toFixed(2);
        ps = new fabric.Text(partSize, {
            left: (part.x1 + part.x2)/2,
            top:  (part.y1 + part.y2)/2,
            angle: part.angle,
            fontSize: 12,
            fontFamily: "arial",
            lineHeight: 2.5,
            originY: "botom",
            originX: "center",
            hasBorders: false
        });
        renderer.group.addWithUpdate(ps);
    });
};


Renderer.prototype.renderEntranceLabels = function(fence) {
    var entranceType, entranceSize, t, s,
        renderer = this;

    $.each(fence.edges, function(i, edge) {
        $.each(fence.entrances[i], function(j, entrance) {
            entranceSize = entrance.length.toFixed(1);
            entranceType = (
                (entrance.type == "gate") ? "В" :
                (entrance.type == "wicket") ? "К" : "П"
            );

            t = new fabric.Text(entranceType, {
                left: (entrance.x1 + entrance.x2)/2,
                top:  (entrance.y1 + entrance.y2)/2,
                originY: "top",
                originX: "center",
                angle: entrance.angle,
                fontSize: 12,
                fontFamily: "arial",
                hasBorders: false
            });
            renderer.group.addWithUpdate(t);

            s = new fabric.Text(entranceSize, {
                left: (entrance.x1 + entrance.x2)/2,
                top:  (entrance.y1 + entrance.y2)/2,
                originX: "center",
                originY: "bottom",
                angle: entrance.angle,
                fontSize: 12,
                fontFamily: "arial",
                hasBorders: false
            });
            renderer.group.addWithUpdate(s);
        });
    });
};
