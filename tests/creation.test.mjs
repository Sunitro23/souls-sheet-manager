import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCreation,initialStats,pointsSpent,POINT_COSTS} from '../lib/creation.ts';
test('base 8, coûts progressifs fidèles au point buy',()=>{assert.equal(pointsSpent(initialStats()),0);assert.equal(POINT_COSTS[14]-POINT_COSTS[13],2);assert.equal(POINT_COSTS[16]-POINT_COSTS[15],3);assert.equal(POINT_COSTS[20],24)});
test('exactement 36 points sur les six caractéristiques',()=>{const stats={FOR:16,DEX:16,CON:16,INT:8,SAG:8,CHA:8};assert.deepEqual(validateCreation(stats),stats);assert.throws(()=>validateCreation(initialStats()),/36/);assert.throws(()=>validateCreation({...stats,INT:9}),/36/);assert.throws(()=>validateCreation({...stats,FOR:99}),/2 et 28/);assert.throws(()=>validateCreation({...stats,DEX:15.5}),/2 et 28/);assert.throws(()=>validateCreation({FOR:16}),/2 et 28/)});

test('création de 2 à 28 avec budget équilibré',()=>{const s={FOR:28,DEX:2,CON:2,INT:8,SAG:8,CHA:8};assert.equal(pointsSpent(s),36);assert.deepEqual(validateCreation(s),s);assert.throws(()=>validateCreation({...s,FOR:29}),/2 et 28/);assert.throws(()=>validateCreation({...s,DEX:1}),/2 et 28/);});
