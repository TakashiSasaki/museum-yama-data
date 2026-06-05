'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function haversineDistance(lon1, lat1, lon2, lat2) {
    const R = 6371000; // meters
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Parses and processes GeoJSON data to determine municipality land adjacency.
 * @param {Object} geojsonParsed Parsed GeoJSON object
 * @returns {Object} processed results
 */
function processAdjacency(geojsonParsed) {
    const munEdges = {};
    const munVertices = {};
    const munCodes = {};
    const munNames = [];
    
    // 1. Group features by municipality (name/code) and validate Ehime prefecture code (38)
    for (const feature of geojsonParsed.features) {
        const name = feature.properties.N03_004;
        const code = feature.properties.N03_007;
        const pref = feature.properties.N03_001;
        
        if (!name || !code) continue;
        
        // Validation: must be Ehime Prefecture (code starting with 38)
        if (!code.startsWith('38') || pref !== '愛媛県') {
            throw new Error(`Invalid prefecture/code in GeoJSON: ${pref} (${code})`);
        }
        
        if (!munEdges[name]) {
            munEdges[name] = new Set();
            munVertices[name] = new Set();
            munCodes[name] = code;
            munNames.push(name);
        }
        
        const geom = feature.geometry;
        if (!geom) continue;

        const processPolygon = (rings) => {
            for (const ring of rings) {
                for (let i = 0; i < ring.length - 1; i++) {
                    const p1 = ring[i];
                    const p2 = ring[i+1];
                    const key1 = `${p1[0].toFixed(7)},${p1[1].toFixed(7)}`;
                    const key2 = `${p2[0].toFixed(7)},${p2[1].toFixed(7)}`;
                    
                    munVertices[name].add(key1);
                    munVertices[name].add(key2);

                    if (key1 === key2) continue;
                    const edgeKey = [key1, key2].sort().join(';');
                    munEdges[name].add(edgeKey);
                }
            }
        };
        
        if (geom.type === 'Polygon') {
            processPolygon(geom.coordinates);
        } else if (geom.type === 'MultiPolygon') {
            for (const poly of geom.coordinates) {
                processPolygon(poly);
            }
        }
    }
    
    // Sort municipalities deterministically by local government code
    munNames.sort((a, b) => munCodes[a].localeCompare(munCodes[b]));
    
    if (munNames.length !== 20) {
        throw new Error(`Expected exactly 20 Ehime municipalities, found ${munNames.length}`);
    }
    
    const adjacencyList = {};
    for (const name of munNames) {
        adjacencyList[name] = [];
    }
    
    const pairs = [];
    let confirmedLandBoundaryPairsCount = 0;
    let pointContactOnlyPairsCount = 0;
    let notAdjacentPairsCount = 0;
    
    for (let i = 0; i < munNames.length; i++) {
        for (let j = i + 1; j < munNames.length; j++) {
            const munA = munNames[i];
            const munB = munNames[j];
            
            const edgesA = munEdges[munA];
            const edgesB = munEdges[munB];
            
            let sharedLength = 0;
            let sharedEdgeCount = 0;
            
            for (const edge of edgesA) {
                if (edgesB.has(edge)) {
                    sharedEdgeCount++;
                    const [pt1, pt2] = edge.split(';');
                    const [lon1, lat1] = pt1.split(',').map(Number);
                    const [lon2, lat2] = pt2.split(',').map(Number);
                    sharedLength += haversineDistance(lon1, lat1, lon2, lat2);
                }
            }
            
            let relationship = 'not_adjacent';
            let intersectionType = 'none';
            let notes = 'no shared boundary';
            
            if (sharedEdgeCount > 0 && sharedLength > 10.0) {
                relationship = 'confirmed_land_boundary';
                intersectionType = 'line';
                notes = 'shared land boundary';
                confirmedLandBoundaryPairsCount++;
                adjacencyList[munA].push(munB);
                adjacencyList[munB].push(munA);
            } else {
                // Check for point contact using vertices
                const verticesA = munVertices[munA];
                const verticesB = munVertices[munB];
                let sharedVertexCount = 0;
                for (const v of verticesA) {
                    if (verticesB.has(v)) {
                        sharedVertexCount++;
                    }
                }
                
                if (sharedVertexCount > 0 || sharedEdgeCount > 0) {
                    relationship = 'point_contact_only';
                    intersectionType = 'point';
                    notes = 'point-only contact';
                    pointContactOnlyPairsCount++;
                } else {
                    notAdjacentPairsCount++;
                }
            }
            
            pairs.push({
                municipality_a_code: munCodes[munA],
                municipality_a_name: munA,
                municipality_b_code: munCodes[munB],
                municipality_b_name: munB,
                relationship,
                boundary_intersection_type: intersectionType,
                shared_boundary_length_m: parseFloat(sharedLength.toFixed(3)),
                intersection_area_m2: 0.0,
                notes
            });
        }
    }
    
    // Sort land adjacent lists for each municipality deterministically by code
    for (const name of munNames) {
        adjacencyList[name].sort((a, b) => munCodes[a].localeCompare(munCodes[b]));
    }
    
    const municipalitiesList = munNames.map(name => ({
        code: munCodes[name],
        name: name
    }));
    
    return {
        municipalities: municipalitiesList,
        land_adjacent: adjacencyList,
        pairs,
        summary: {
            municipality_count: munNames.length,
            pair_count: pairs.length,
            confirmed_land_boundary_pairs: confirmedLandBoundaryPairsCount,
            point_contact_only_pairs: pointContactOnlyPairsCount,
            not_adjacent_pairs: notAdjacentPairsCount
        }
    };
}

module.exports = {
    processAdjacency,
    haversineDistance
};
