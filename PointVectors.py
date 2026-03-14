import numpy as np
import pandas as pd
import os
from sklearn.manifold import MDS 
import functools
from sklearn.cluster import KMeans
import math

dataframe = pd.read_csv(os.getcwd() + "\\CSE332 Dataset.csv")

dataframe['Yarn Cost'] = dataframe['YY'] * dataframe["Fabric (per yd/lb)"]

result = []
numIters = 7


for i in range(1,numIters + 1):
    result.append(KMeans(n_clusters = i).fit(dataframe[['First Cost', 'Landed Cost', 'Hanger', 'Packaging & Label', 'Trim', 'Wash', 'Yarn Cost', 'Tertiary Cost']]))

def euclidDistance(vector1, vector2):
    if(len(vector1) != len(vector2)):
        print("Vector lengths not equal: ", vector1, vector2, ". Will cut off extraneous numbers")
    return math.sqrt(functools.reduce(lambda acc,x: acc+x,map(lambda x: pow(x[0]-x[1],2),zip(vector1,vector2)),0))

dfArray = list(map(lambda kmeansObj: list(zip(list(dataframe[['First Cost', 'Landed Cost', 'Hanger', 'Packaging & Label', 'Trim', 'Wash', 'Yarn Cost', 'Tertiary Cost']].values),list(map(lambda clusterId: kmeansObj.cluster_centers_[clusterId],kmeansObj.labels_)))),result))

objectiveFunction = list(map(lambda numClusters: pow(functools.reduce(lambda acc,x: acc+euclidDistance(x[0],x[1]),numClusters,0),2),dfArray))

colorResult = list(map(lambda kmeansObj: list(zip(list(map(lambda x:list(x),dataframe[['Supplier Name','Item ID']].values)),kmeansObj.labels_)),result))

colorKMeans = list(map(lambda x:list(x),colorResult[2]))


f = open("objectiveValues.csv", "w")
f.write(str(objectiveFunction)[1:-1])
f.close()

f = open("kMeansGroup.csv", "w")
f.write("Supplier Name,Item ID, Group\n")
for entry in colorKMeans:
    f.write(entry[0][0] + "," + str(entry[0][1]) + "," + str(entry[1]) + "\n")
f.close()

