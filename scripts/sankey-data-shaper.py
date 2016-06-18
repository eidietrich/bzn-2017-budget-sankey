"""
sankey-data-shaper.py
.csv --> .json for producing sankey diagrams with D3.js

INPUT:
.csv's with three columns (source, target, value), 
each row representing a separate flow

OUTPUT:
Sankey json structure:
{
    'nodes': [
    {'node':0,'name':'node0'},
    {'node':1,'name':'node1'},
    {'node':2,'name':'node2'}
    ],
    'links': [
    {'source':0,'target':2,'value':2},
    {'source':1,'target':2,'value':3}
    ]
}
"""

print 'Starting...'

import pandas as pd
import json

rev = pd.read_csv('../data/bzn-2017-budget-revenue-hand-compiled.csv')
# print rev.head(20)


exp = pd.read_csv('../data/bzn-2017-budget-spending-hand-compiled.csv')

df_sankey = pd.concat([rev,exp])

def validate(in_df, out_df):
    """Prints target nodes in in that aren't paired to source nodes in out"""

    def test_for_match(item, match_col):
            for match in matchtch_col:
                if item == match:
                    # print item, match
                    return None
            print 'No match for ', item

    print 'Testing for missing targets (in source file)'
    for target in in_df['target']:
        test_for_match(target, out_df['source'])

    print 'Testing for missing sources'
    for source in out_df['source']:
        test_for_match(source, in_df['target'])

# validate(rev, exp)

def get_json(file_path):
    """Imports json as dict"""
    with open(file_path) as f:
        return json.load(f)

def to_json(df, file_path):
    """Exports dataframe as appropriately shaped json"""
    graph = {'nodes': [], 'links':[]}

    # Add source/target names to nodes array
    for row in df['source']:
        if {'name': row} not in graph['nodes']:
            graph['nodes'].append({'name': row})
            
    for row in df['target']:
        if {'name': row} not in graph['nodes']:
            graph['nodes'].append({'name': row})

    # Add source/target/value to links array
    # # Potential bug - pandas docs say apply operates twice on first row of dataframe, 
    # # but it doesn't look like that's causing issues here
    df.apply(lambda row: graph['links'].append({'source': row['source'],'target': row['target'],
                                                       'value': row['value']}), axis=1)

    

    # Add "node":i labels to index nodes
    # Also add additional node-specific data from external 'node keys' json
    # TODO: Refactor this as separate data-cleaning function
    node_keys = get_json('../data/node-keys.json')
    for i, node in enumerate(graph['nodes']):
        node['node'] = i
        node['color'] = node_keys[node['name']]['color']
        node['col'] = node_keys[node['name']]['col']
        node['rank'] = node_keys[node['name']]['rank']
        node['label-name'] = node_keys[node['name']]['label-name']
        
    # Replace node 'name' labels in each link with node indices
    for link in graph['links']:
        for node in graph['nodes']:
            if node['name'] == link['source']:
                link['source'] = node['node']
        for node in graph['nodes']:
            if node['name'] == link['target']:
                link['target'] = node['node']

    # # print 'Nodes'
    # for node in graph['nodes']:
    #     string = '"%s"' % node['name']
    #     string += ': {"col": 0, "rank": 0, "color": "#b0b0b0", "label-name": "%s"' % node['name']
    #     string += '},'
    #     print string
        
    with open(file_path,'wb') as f:
        json.dump(graph, f, indent=4)

to_json(df_sankey, '../data/combined.json')