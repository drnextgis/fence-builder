function Fence(table, close, split, scale) {
    this.initialize(table, close, split, scale);
};


Fence.prototype.initialize = function(table, close, split, scale) {
    this.split  = split;
    this.scale  = scale;
    this.edges  = [];

    // Непрерывные сегменты, сгруппированы по сторонам
    this.segments = [];

    // Калитки, ворота, пропуски
    // сгруппированы по сторонам
    this.entrances = [];

    // Столбы
    this.columns = [];

    // Участки между столбами
    this.parts = [];

    this.source = this.parseTable(table);
    this.source.close = close;

    this.buildEdges();
    this.buildEntrances();
    this.buildSegments();
    this.buildColumns();
};


Fence.prototype.buildEdges = function() {
    var x1, x2, y1, y2, a, l, f, dx, dy;
    var fence = this;

    $.each(this.source.sides, function(i, side) {
        l = side.length;
        f = side.frequency;

        a  = (i == 0) ? side.angle : a + fence.edges[i-1].angle;
        x1 = (i == 0) ? 0 : fence.edges[i-1].x2;
        y1 = (i == 0) ? 0 : fence.edges[i-1].y2;
        x2 = x1 + Math.round(l*Math.cos(Math.PI*a/180)*fence.scale*100)/100;
        y2 = y1 + Math.round(l*Math.sin(Math.PI*a/180)*fence.scale*100)/100;

        fence.edges.push({
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            angle: a,
            frequency: f,
            length: l
        });

        // Замыкающий сегмент
        if ((i > 0) && (i == (fence.source.sides.length -1)) && fence.source.close) {
            x1 = x2;
            y1 = y2;
            x2 = fence.edges[0].x1;
            y2 = fence.edges[0].y1;
            dx = x2 - x1;
            dy = y2 - y1;
            a = Math.atan2(dy, dx)*(180/Math.PI);
            l = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))/fence.scale;

            fence.edges.push({
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2,
                angle: a,
                frequency: f,
                length: l
            });
        }
    });
};


Fence.prototype.buildEntrances = function() {
    var x1, x2, y1, y2;
    var fence = this;

    $.each(this.source.sides, function(i, side) {
        if (side.entrances.length == 0) {
            fence.entrances.push([]);
        } else {
            var edge = fence.edges[i];
            var entrances = [];
            $.each(side.entrances, function(j, entrance) {
                x1 = edge.x1 + Math.round(entrance.offset*Math.cos(Math.PI*edge.angle/180)*fence.scale*100)/100;
                y1 = edge.y1 + Math.round(entrance.offset*Math.sin(Math.PI*edge.angle/180)*fence.scale*100)/100;
                x2 = x1 + Math.round(entrance.length*Math.cos(Math.PI*edge.angle/180)*fence.scale*100)/100;
                y2 = y1 + Math.round(entrance.length*Math.sin(Math.PI*edge.angle/180)*fence.scale*100)/100;
                entrances.push({
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    angle: edge.angle,
                    type: entrance.type,
                    length: entrance.length
                });
            });
            fence.entrances.push(entrances);
        }
    });
    // Делаем предположение, что на замыкающей стороне
    // нет калиток, ворот или препятствий
    if (fence.source.close) {
        fence.entrances.push([]);
    }
};


Fence.prototype.buildSegments = function() {
    var coords, fence = this;

    $.each(this.edges, function(i, edge) {
        var segment, segments = [];


        var segmentXStart = edge.x1,
            segmentYStart = edge.y1,
            segmentXEnd = edge.x1,
            segmentYEnd = edge.y1;

        $.each(fence.entrances[i], function(j, entrance) {
            segmentXEnd = entrance.x1;
            segmentYEnd = entrance.y1;

            if (!((segmentXStart == segmentXEnd) && (segmentYStart == segmentYEnd))) {
                segments.push({
                    x1: segmentXStart,
                    y1: segmentYStart,
                    x2: segmentXEnd,
                    y2: segmentYEnd
                });
            }

            segmentXStart = entrance.x2;
            segmentYStart = entrance.y2;
        });

        segmentXEnd = edge.x2;
        segmentYEnd = edge.y2;

        if (!((segmentXStart == segmentXEnd) && (segmentYStart == segmentYEnd))) {
            segments.push({
                x1: segmentXStart,
                y1: segmentYStart,
                x2: segmentXEnd,
                y2: segmentYEnd
            });
        }

        fence.segments.push(segments);
    });
};


Fence.prototype.buildColumns = function() {
    var ptJSTS, segmentJSTS, partJSTS, partJSTSLength, segmentJSTSLength, pt,
        columnJSTS = new jsts.geom.MultiPoint(),
        columnRegularJSTS = new jsts.geom.MultiPoint(),
        columnIrregularJSTS = new jsts.geom.MultiPoint(),
        part, lastColumn,
        fence = this;

    $.each(this.entrances, function(i, entranceGroup) {
        $.each(entranceGroup, function(j, entrance) {
            // Столбы для калиток и ворот
            if (entrance.type !== "obstacle") {
                $.each([
                    new jsts.geom.Point(new jsts.geom.Coordinate(
                        entrance.x1,
                        entrance.y1
                    )),
                    new jsts.geom.Point(new jsts.geom.Coordinate(
                        entrance.x2,
                        entrance.y2
                    ))
                ], function(k, pt) {
                    if (!columnJSTS.contains(pt)) {
                        columnJSTS = columnJSTS.union(pt);
                        columnIrregularJSTS = columnIrregularJSTS.union(pt)
                    }
                });
            }
        });
    });


    // Столбы для непрерывных сегментов
    $.each(this.edges, function(i, edge) {
        $.each(fence.segments[i], function(j, segment) {
            segmentJSTS = new jsts.geom.LineSegment(
                new jsts.geom.Coordinate(segment.x1, segment.y1),
                new jsts.geom.Coordinate(segment.x2, segment.y2)
            );
            lastColumn = {
                x: segment.x1,
                y: segment.y1
            };

            segmentJSTSLength = +(segmentJSTS.getLength().toFixed(1));
            for (var offset = 0; offset <= (segmentJSTS.getLength()/fence.scale); offset += edge.frequency) {
                ptJSTS = new jsts.geom.Point(new jsts.geom.Coordinate(
                    segment.x1 + Math.round(offset*Math.cos(Math.PI*edge.angle/180)*fence.scale*100)/100,
                    segment.y1 + Math.round(offset*Math.sin(Math.PI*edge.angle/180)*fence.scale*100)/100
                ));

                if (!columnJSTS.contains(ptJSTS)) {
                    columnJSTS = columnJSTS.union(ptJSTS);
                    columnRegularJSTS = columnRegularJSTS.union(ptJSTS);
                }

                if (offset > 0) {
                    part = {
                        x1: lastColumn.x,
                        y1: lastColumn.y,
                        x2: ptJSTS.getX(),
                        y2: ptJSTS.getY(),
                        angle: edge.angle,
                        length: edge.frequency
                    };
                    fence.parts.push(part)
                    lastColumn.x = part.x2;
                    lastColumn.y = part.y2;
                }

                // Предпоследний столб ставим в середину
                if (fence.split){
                    partJSTS = new jsts.geom.LineSegment(
                        new jsts.geom.Coordinate(ptJSTS.getX(), ptJSTS.getY()),
                        new jsts.geom.Coordinate(segment.x2, segment.y2)
                    );

                    partJSTSLength = +(partJSTS.getLength().toFixed(1));
                    if (
                        (partJSTSLength < edge.frequency*fence.scale*2) &&
                        (partJSTSLength > edge.frequency*fence.scale)
                    ) {
                        pt = new jsts.geom.Point(new jsts.geom.Coordinate(
                            ptJSTS.getX() + Math.round((partJSTSLength/2)*Math.cos(Math.PI*edge.angle/180)*100)/100,
                            ptJSTS.getY() + Math.round((partJSTSLength/2)*Math.sin(Math.PI*edge.angle/180)*100)/100
                        ));
                        if (!columnJSTS.contains(pt)) {
                            columnJSTS = columnJSTS.union(pt);
                            columnRegularJSTS = columnRegularJSTS.union(pt);
                        }

                        part = {
                            x1: lastColumn.x,
                            y1: lastColumn.y,
                            x2: pt.getX(),
                            y2: pt.getY(),
                            angle: edge.angle,
                            length: (partJSTSLength/2)/fence.scale
                        }
                        fence.parts.push(part);
                        lastColumn.x = part.x2;
                        lastColumn.y = part.y2;
                        break;
                    }
                }
            }

            // Последний столб
            pt = new jsts.geom.Point(new jsts.geom.Coordinate(
                segment.x2,
                segment.y2
            ));
            if (!columnJSTS.contains(pt)) {
                columnJSTS = columnJSTS.union(pt);
                columnRegularJSTS = columnRegularJSTS.union(pt);
            }

            var dx = segment.x2 - lastColumn.x;
            var dy = segment.y2 - lastColumn.y;
            var length = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))/fence.scale;
            if (length !== 0) {
                part = {
                    x1: lastColumn.x,
                    y1: lastColumn.y,
                    x2: segment.x2,
                    y2: segment.y2,
                    angle: edge.angle,
                    length: length
                };
                fence.parts.push(part);
            }
        });
    });

    for (var gid = 0; gid < columnJSTS.getNumGeometries(); gid += 1) {
        var geometry = columnJSTS.getGeometryN(gid),
            coords = geometry.getCoordinates(),
            columnType = (columnIrregularJSTS.contains(geometry)) ? "irregular" : "regular";

        fence.columns.push({
            x: coords[0].x,
            y: coords[0].y,
            type: columnType
        });
    }
};


Fence.prototype.render = function(renderer) {
    renderer.render(this);
};


Fence.prototype.parseTable = function(table) {
    var side, length, frequency, angle,
        gateLength, wicketLength, obstacleLength,
        gateOffset, wicketOffset, obstacleOffset,
        source = {sides: []};

    $("#" + table + " tbody tr").each(function(i) {
        length         = parseFloat($(this).find(".length").text());
        frequency      = parseFloat($(this).find(".frequency").text());
        angle          = parseFloat($(this).find(".angle").text());
        gateLength     = parseFloat($(this).find(".gate").text());
        wicketLength   = parseFloat($(this).find(".wicket").text());
        obstacleLength = parseFloat($(this).find(".obstacle").text());
        gateOffset     = parseFloat($(this).find(".gate-offset").text());
        wicketOffset   = parseFloat($(this).find(".wicket-offset").text());
        obstacleOffset = parseFloat($(this).find(".obstacle-offset").text());

        side = {
            length: length,
            frequency: frequency,
            angle: angle,
            entrances: []
        };

        if (gateLength > 0) {
            side.entrances.push({
                length: gateLength,
                offset: gateOffset,
                type:   "gate"
            });
        }

        if (wicketLength > 0) {
            side.entrances.push({
                length: wicketLength,
                offset: wicketOffset,
                type: "wicket"
            });
        }

        if (obstacleLength > 0) {
            side.entrances.push({
                length: obstacleLength,
                offset: obstacleOffset,
                type: "obstacle"
            });
        }

        // Сортируем ворота, калитки и препятствия в порядке
        // удалённости от начала стороны забора
        side.entrances.sort(function(a, b) {
            return a.offset - b.offset;
        });

        source.sides.push(side);
    });
    return source;
};
